const TelegramBot = require("node-telegram-bot-api");
const userModel = require("../model/user.model");
const productModel = require("../model/product.model");
const { createOrder } = require("../app/controllers/orders.controller");

const ADMIN_ROLE = "ADMIN";
const PAGE_SIZE = 6;
const PAYMENT_OPTIONS = [
  { method: "CASH", label: "Cash" },
  { method: "TRANSFER_TECHCOMBANK", label: "Techcombank transfer" },
  { method: "TRANSFER_MOMO", label: "Momo transfer" },
];

let bot = null;
const sessions = new Map();

const getSession = (chatId) => sessions.get(chatId);
const resetSession = (chatId) => sessions.delete(chatId);
const startSession = (chatId) => {
  const session = { step: "BROWSING", page: 0, cart: [], shippingFee: 0, discountType: null, discountValue: 0 };
  sessions.set(chatId, session);
  return session;
};

const findLinkedAdmin = async (chatId) => {
  const user = await userModel.findOne({ telegramChatId: String(chatId) }).populate("roles");
  if (!user) return null;
  const isAdmin = user.roles?.some((role) => role.role === ADMIN_ROLE);
  return isAdmin ? user : null;
};

const sendProductPage = async (chatId, session) => {
  const totalCount = await productModel.countDocuments();
  const products = await productModel
    .find()
    .sort({ name: 1 })
    .skip(session.page * PAGE_SIZE)
    .limit(PAGE_SIZE);

  const cartQuantityById = new Map(session.cart.map((entry) => [entry.productId, entry.quantity]));

  const rows = products.map((product) => {
    const inCart = cartQuantityById.get(String(product._id));
    const label = `${product.name} — ${product.price} (stock: ${product.stock})${inCart ? ` [in cart: ${inCart}]` : ""}`;
    return [{ text: label, callback_data: `add:${product._id}` }];
  });

  const pageCount = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const navRow = [];
  if (session.page > 0) navRow.push({ text: "◀ Prev", callback_data: "page:prev" });
  if (session.page < pageCount - 1) navRow.push({ text: "Next ▶", callback_data: "page:next" });
  if (navRow.length) rows.push(navRow);

  if (session.cart.length > 0) {
    rows.push([{ text: `Done selecting (${session.cart.length} item(s))`, callback_data: "done" }]);
  }
  rows.push([{ text: "Cancel order", callback_data: "cancel" }]);

  const text = `Select products (page ${session.page + 1}/${pageCount}). Tap a product to add it to the order.`;
  await bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: rows } });
};

const sendPaymentOptions = async (chatId) => {
  const rows = PAYMENT_OPTIONS.map((option) => [{ text: option.label, callback_data: `pm:${option.method}` }]);
  await bot.sendMessage(chatId, "Choose payment method:", { reply_markup: { inline_keyboard: rows } });
};

const sendDiscountOptions = async (chatId) => {
  const rows = [
    [{ text: "No discount", callback_data: "disc:NONE" }],
    [{ text: "Flat amount", callback_data: "disc:FLAT" }],
    [{ text: "Percent", callback_data: "disc:PERCENT" }],
  ];
  await bot.sendMessage(chatId, "Apply a discount?", { reply_markup: { inline_keyboard: rows } });
};

const sendConfirmSummary = async (chatId, session) => {
  const products = await productModel.find({ _id: { $in: session.cart.map((entry) => entry.productId) } });
  const priceById = new Map(products.map((product) => [String(product._id), product.priceInInteger]));
  const nameById = new Map(products.map((product) => [String(product._id), product.name]));

  let subtotal = 0;
  const lines = session.cart.map((entry) => {
    const lineTotal = (priceById.get(entry.productId) || 0) * entry.quantity;
    subtotal += lineTotal;
    return `${entry.quantity} x ${nameById.get(entry.productId) || entry.productId} = ${lineTotal} VNĐ`;
  });

  let discountAmount = 0;
  if (session.discountType === "FLAT") discountAmount = session.discountValue;
  if (session.discountType === "PERCENT") discountAmount = Math.round((subtotal * session.discountValue) / 100);
  const total = Math.max(subtotal - discountAmount, 0) + session.shippingFee;

  const summary = [
    "Order summary:",
    ...lines,
    `Subtotal: ${subtotal} VNĐ`,
    `Shipping: ${session.shippingFee} VNĐ`,
    session.discountType ? `Discount: -${discountAmount} VNĐ` : null,
    `Total: ${total} VNĐ`,
    `Payment: ${session.paymentMethod}`,
  ]
    .filter(Boolean)
    .join("\n");

  await bot.sendMessage(chatId, summary, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Place order", callback_data: "confirm" },
          { text: "Cancel", callback_data: "cancel" },
        ],
      ],
    },
  });
};

const handleNewOrderCommand = async (chatId) => {
  const admin = await findLinkedAdmin(chatId);
  if (!admin) {
    await bot.sendMessage(
      chatId,
      "This Telegram account isn't linked to an admin account yet. Generate a link code from your account page on the website, then send /link <code> here."
    );
    return;
  }
  const session = startSession(chatId);
  session.userName = admin.userName;
  await sendProductPage(chatId, session);
};

const handleLinkCommand = async (chatId, code) => {
  if (!code) {
    await bot.sendMessage(chatId, "Usage: /link <code>");
    return;
  }
  const user = await userModel.findOne({
    telegramLinkCode: code,
    telegramLinkCodeExpiresAt: { $gt: new Date() },
  });
  if (!user) {
    await bot.sendMessage(chatId, "That code is invalid or expired. Generate a new one from the website.");
    return;
  }
  user.telegramChatId = String(chatId);
  user.telegramLinkCode = null;
  user.telegramLinkCodeExpiresAt = null;
  await user.save();
  await bot.sendMessage(chatId, `Linked! This chat is now connected to account "${user.userName}".`);
};

const handleMessage = async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;

  if (text.startsWith("/link")) {
    const [, code] = text.split(/\s+/);
    await handleLinkCommand(chatId, code);
    return;
  }

  if (text === "/neworder") {
    await handleNewOrderCommand(chatId);
    return;
  }

  const session = getSession(chatId);
  if (!session) return;

  if (session.step === "AWAITING_QUANTITY") {
    const quantity = Number.parseInt(text, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      await bot.sendMessage(chatId, "Please enter a valid whole number quantity (1 or more).");
      return;
    }
    const existing = session.cart.find((entry) => entry.productId === session.pendingProductId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      session.cart.push({ productId: session.pendingProductId, quantity });
    }
    session.pendingProductId = null;
    session.step = "BROWSING";
    await sendProductPage(chatId, session);
    return;
  }

  if (session.step === "AWAITING_SHIPPING_FEE") {
    const shippingFee = Number.parseInt(text, 10);
    if (!Number.isInteger(shippingFee) || shippingFee < 0) {
      await bot.sendMessage(chatId, "Please enter a valid shipping fee (0 or more).");
      return;
    }
    session.shippingFee = shippingFee;
    session.step = "AWAITING_PAYMENT_METHOD";
    await sendPaymentOptions(chatId);
    return;
  }

  if (session.step === "AWAITING_DISCOUNT_VALUE") {
    const value = Number.parseInt(text, 10);
    if (!Number.isInteger(value) || value < 0) {
      await bot.sendMessage(chatId, "Please enter a valid discount value (0 or more).");
      return;
    }
    session.discountValue = value;
    session.step = "CONFIRMING";
    await sendConfirmSummary(chatId, session);
    return;
  }
};

const handleCallbackQuery = async (query) => {
  const chatId = query.message.chat.id;
  const session = getSession(chatId);
  const data = query.data;
  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (data === "cancel") {
    resetSession(chatId);
    await bot.sendMessage(chatId, "Order cancelled.");
    return;
  }

  if (!session) return;

  if (data.startsWith("add:")) {
    session.pendingProductId = data.slice(4);
    session.step = "AWAITING_QUANTITY";
    await bot.sendMessage(chatId, "Enter quantity for this product:");
    return;
  }

  if (data === "page:prev") {
    session.page = Math.max(session.page - 1, 0);
    await sendProductPage(chatId, session);
    return;
  }

  if (data === "page:next") {
    session.page += 1;
    await sendProductPage(chatId, session);
    return;
  }

  if (data === "done") {
    if (session.cart.length === 0) {
      await bot.sendMessage(chatId, "Add at least one product before continuing.");
      return;
    }
    session.step = "AWAITING_SHIPPING_FEE";
    await bot.sendMessage(chatId, "Enter shipping fee (VNĐ, 0 if none):");
    return;
  }

  if (data.startsWith("pm:")) {
    session.paymentMethod = data.slice(3);
    session.step = "AWAITING_DISCOUNT_TYPE";
    await sendDiscountOptions(chatId);
    return;
  }

  if (data.startsWith("disc:")) {
    const type = data.slice(5);
    if (type === "NONE") {
      session.discountType = null;
      session.discountValue = 0;
      session.step = "CONFIRMING";
      await sendConfirmSummary(chatId, session);
    } else {
      session.discountType = type;
      session.step = "AWAITING_DISCOUNT_VALUE";
      await bot.sendMessage(chatId, type === "FLAT" ? "Enter flat discount amount (VNĐ):" : "Enter discount percent:");
    }
    return;
  }

  if (data === "confirm") {
    const admin = await findLinkedAdmin(chatId);
    if (!admin) {
      resetSession(chatId);
      await bot.sendMessage(chatId, "This account is no longer linked to an admin. Order not placed.");
      return;
    }
    try {
      const savedOrder = await createOrder({
        userName: admin.userName,
        isGuess: false,
        receipentName: admin.receipentName || admin.userName,
        phoneNumber: admin.phoneNumber || "",
        address: admin.address || "",
        ward: admin.ward || "",
        district: admin.district || "",
        city: admin.city || "",
        items: session.cart.map((entry) => ({ _id: entry.productId, quantity: entry.quantity })),
        paymentMethod: session.paymentMethod,
        shippingFee: session.shippingFee,
        discountType: session.discountType,
        discountValue: session.discountValue,
        source: "TELEGRAM",
      });
      resetSession(chatId);
      await bot.sendMessage(chatId, `Order placed! Order ID: ${savedOrder._id}`);
    } catch (error) {
      await bot.sendMessage(chatId, `Failed to place order: ${error.message}`);
    }
    return;
  }
};

const init = () => {
  if (bot || !process.env.TELEGRAM_BOT_TOKEN) return;
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  bot.on("message", (msg) => {
    handleMessage(msg).catch((error) => console.error("Telegram message handling failed:", error.message));
  });
  bot.on("callback_query", (query) => {
    handleCallbackQuery(query).catch((error) => console.error("Telegram callback handling failed:", error.message));
  });

  if (process.env.TELEGRAM_WEBHOOK_URL) {
    bot.setWebHook(process.env.TELEGRAM_WEBHOOK_URL).catch((error) => {
      console.error("Failed to set Telegram webhook:", error.message);
    });
  }
};

const handleUpdate = async (update) => {
  if (!bot) return;
  bot.processUpdate(update);
};

module.exports = { init, handleUpdate };
