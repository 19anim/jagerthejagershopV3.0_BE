const TelegramBot = require("node-telegram-bot-api");
const userModel = require("../../model/user.model");
const orderModel = require("../../model/order.model");
const statusModel = require("../../model/status.model");
const productModel = require("../../model/product.model");
const DEFAULT_ORDER_STATUS = "CREATED";
const ADMIN_ROLE = "ADMIN";
const ORDER_STATUSES = ["CREATED", "CONFIRMED", "SHIPPING", "COMPLETED"];

const isAdmin = (user) => user?.roles?.some((role) => role.role === ADMIN_ROLE);

const normalizeInventoryItems = (items) => {
  const quantitiesByProduct = new Map();

  items.forEach((item) => {
    const quantity = Number(item.quantity);
    if (!item._id || !Number.isInteger(quantity) || quantity < 1) {
      const error = new Error("Sản phẩm hoặc số lượng không hợp lệ.");
      error.statusCode = 400;
      throw error;
    }
    quantitiesByProduct.set(item._id, (quantitiesByProduct.get(item._id) || 0) + quantity);
  });

  return Array.from(quantitiesByProduct, ([item, quantity]) => ({ item, quantity }));
};

const releaseInventory = async (reservedItems) => {
  if (reservedItems.length === 0) return;
  await productModel.bulkWrite(
    reservedItems.map(({ item, quantity }) => ({
      updateOne: {
        filter: { _id: item },
        update: { $inc: { stock: quantity, soldAmount: -quantity } },
      },
    }))
  );
};

const reserveInventory = async (items) => {
  const reservedItems = [];

  try {
    for (const { item, quantity } of items) {
      const result = await productModel.updateOne(
        { _id: item, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, soldAmount: quantity } }
      );
      if (result.modifiedCount !== 1) {
        const error = new Error("Một sản phẩm đã hết hàng hoặc không đủ số lượng.");
        error.statusCode = 400;
        throw error;
      }
      reservedItems.push({ item, quantity });
    }
  } catch (error) {
    await releaseInventory(reservedItems);
    throw error;
  }

  return reservedItems;
};

const orderController = {
  getOrderByUserName: async (req, res) => {
    try {
      const { userName } = req.params;
      if (req.user.userName !== userName && !isAdmin(req.user)) {
        return res.status(403).json({ errorMessage: "Bạn không có quyền xem đơn hàng này." });
      }
      const user = await userModel.findOne({ userName: userName }).populate({
        path: "orders",
        populate: {
          path: "status",
        },
      });
      res.status(200).json(user.orders);
    } catch (error) {
      res.status(500).json(error);
    }
  },
  getOrderByOrderId: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await orderModel
        .findById(orderId)
        .populate({
          path: "items.item",
          populate: {
            path: "category",
          },
        })
        .populate("status");
      if (!order) return res.status(404).json({ errorMessage: "Không tìm thấy đơn hàng." });
      if (order.userName !== req.user.userName && !isAdmin(req.user)) {
        return res.status(403).json({ errorMessage: "Bạn không có quyền xem đơn hàng này." });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json(error);
    }
  },
  getAllOrdersByAdmin: async (req, res) => {
    try {
      // define if this user is admin
      const orders = await orderModel.find().populate("status").sort({ createdAt: -1 });
      return res.status(200).json(orders);
    } catch (error) {
      return res.status(500).json(error);
    }
  },
  updateOrderStatusByAdmin: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { statusName } = req.body;
      if (!ORDER_STATUSES.includes(statusName)) {
        return res.status(400).json({ errorMessage: "Trạng thái đơn hàng không hợp lệ." });
      }
      const statusDocument = await statusModel.findOneAndUpdate(
        { statusName },
        { $setOnInsert: { statusName } },
        { new: true, upsert: true }
      );
      const order = await orderModel
        .findByIdAndUpdate(
          orderId,
          { $set: { status: [statusDocument._id] } },
          { new: true }
        )
        .populate("status");
      if (!order) return res.status(404).json({ errorMessage: "Không tìm thấy đơn hàng." });
      return res.status(200).json(order);
    } catch (error) {
      return res.status(500).json({ errorMessage: error.message });
    }
  },
  placeOrderAndSendMessage: async (req, res) => {
    let reservedItems = [];
    try {
      // Get data from request body
      const { order } = req.body;
      const { userInfor, items, total, paymentMethod } = order;
      const userName = req.user?.userName || "Guess";
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ errorMessage: "Giỏ hàng đang trống." });
      }
      const { receipentName, phoneNumber, address, ward, district, city } =
        userInfor;

      // Get Document of Status
      const userDocument = await userModel.findOne({ userName: userName });
      const defaultStatusDocument = await statusModel.findOne({
        statusName: DEFAULT_ORDER_STATUS,
      });

      // Define object and message to create new document and inform
      const cartItemsMessage = items.map((item) => {
        return `\n${item.quantity} ${item.name}`;
      });
      const orderMessage =
        `${userName} has order ${cartItemsMessage}\nTotal: ${total} VNĐ\nPayment method: ${paymentMethod}`.replaceAll(
          ",",
          ""
        );
      const listItem = normalizeInventoryItems(items);
      const newOrder = new orderModel({
        receipentName: receipentName,
        phoneNumber: phoneNumber,
        address: address,
        ward: ward,
        district: district,
        city: city,
        items: listItem,
        total: total,
        userName: userName,
        isGuess: false,
        paymentMethod: paymentMethod,
        status: defaultStatusDocument._id,
      });
      if (!req.user) newOrder.isGuess = true;

      // Action: save Document of Order, and update Document of User, and send telegram message through BOT
      reservedItems = await reserveInventory(listItem);
      const savedOrder = await newOrder.save();
      reservedItems = [];
      if (userDocument) {
        await userDocument.updateOne({ $push: { orders: savedOrder._id } });
      }
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID_1) {
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
        bot.sendMessage(process.env.TELEGRAM_CHAT_ID_1, orderMessage).catch((error) => {
          console.error("Telegram order notification failed:", error.message);
        });
      }
      res.status(200).json(savedOrder);
    } catch (error) {
      await releaseInventory(reservedItems);
      res.status(error.statusCode || 500).json({ errorMessage: error.message });
    }
  },
};

module.exports = orderController;
