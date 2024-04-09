const express = require("express");
const app = express();
const port = 3000;
const route = require("../src/routes/index.route");
const moongose = require("mongoose");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");
dotenv.config({ path: "./src/.env" });

var corsOptions = {
  origin: ["http://localhost:5173", "https://jagerthejagershop.netlify.app", "https://main--jagerthejagershop.netlify.app/"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan("common"));
route(app);
moongose.connect(process.env.MONGODB_URL).then(console.log("Connected to DB"));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
