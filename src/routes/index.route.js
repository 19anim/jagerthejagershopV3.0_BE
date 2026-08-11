const productsRouter = require("../routes/products.route");
const categoriesRouter = require("../routes/categories.route");
const productsDescriptionRouter = require("../routes/productsDescription.route");
const usersRouter = require("../routes/users.route");
const roleRouter = require("../routes/roles.route");
const orderRouter = require("../routes/orders.route");
const deliveryRouter = require("../routes/delivery.route");
const telegramRouter = require("../routes/telegram.route");

const route = (app) => {
  app.use("/api/products", productsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/productsDescription", productsDescriptionRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/roles", roleRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/telegram", telegramRouter);
  app.use("/", (req, res) => {
    res.send("Index page");
  });
};

module.exports = route;
