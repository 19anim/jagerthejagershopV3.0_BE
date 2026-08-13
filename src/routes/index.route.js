const productsRouter = require("../routes/products.route");
const categoriesRouter = require("../routes/categories.route");
const productsDescriptionRouter = require("../routes/productsDescription.route");
const usersRouter = require("../routes/users.route");
const roleRouter = require("../routes/roles.route");
const orderRouter = require("../routes/orders.route");
const deliveryRouter = require("../routes/delivery.route");
const telegramRouter = require("../routes/telegram.route");
const assetsRouter = require("../routes/assets.route");

const route = (app) => {
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.use("/api/products", productsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/productsDescription", productsDescriptionRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/roles", roleRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/telegram", telegramRouter);
  app.use("/api/assets", assetsRouter);
  app.use("/", (req, res) => {
    res.send("Index page");
  });
};

module.exports = route;
