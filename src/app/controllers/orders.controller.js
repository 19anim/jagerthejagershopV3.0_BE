const TelegramBot = require("node-telegram-bot-api");
const userModel = require("../../model/user.model");
const orderModel = require("../../model/order.model");
const statusModel = require("../../model/status.model");
const DEFAULT_ORDER_STATUS = "CREATED";
const ADMIN_ROLE = "ADMIN";

const orderController = {
  getOrderByUserName: async (req, res) => {
    try {
      const { userName } = req.params;
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
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json(error);
    }
  },
  getAllOrdersByAdmin: async (req, res) => {
    try {
      // define if this user is admin
      const { userName } = req.body;
      if(!userName){
        return res.status(401).json("NOT AUTHORIZED");
      }
      const user = await userModel.findOne({ userName: userName }).populate({
        path: "roles",
      });
      const userRoles = user?.roles;
      const isAdmin = userRoles.findIndex((userRole) => {
        return userRole.role === ADMIN_ROLE;
      })

      // if admin
      if(isAdmin !== -1){
        const orders = await orderModel.find();
        return res.status(200).json(orders);
      }
      //if NOT admin
      else{
        return res.status(401).json({errorMessage: "NOT AUTHORIZED"});
      }
    } catch (error) {
      return res.status(500).json(error);
    }
  },
  placeOrderAndSendMessage: async (req, res) => {
    try {
      // Get data from request body
      const { order } = req.body;
      const { userName, userInfor, items, total, paymentMethod } = order;
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
      const listItem = items.map((item) => {
        return {
          item: item._id,
          quantity: item.quantity,
        };
      });
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
      if (userName === "Guess") newOrder.isGuess = true;

      // Action: save Document of Order, and update Document of User, and send telegram message through BOT
      const savedOrder = await newOrder.save();
      if (userDocument) {
        await userDocument.updateOne({ $push: { orders: savedOrder._id } });
      }
      const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
      bot.sendMessage(process.env.TELEGRAM_CHAT_ID_1, orderMessage);
      res.status(200).json(savedOrder);
    } catch (error) {
      res.status(500).json(error);
    }
  },
};

module.exports = orderController;
