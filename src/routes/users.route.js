const express = require("express");
const router = express.Router();
const usersController = require("../app/controllers/users.controller");
const verifyAndRefreshAccessToken = require("../middlewares/verifyAndRefreshToken.middleware");

router.post("/addNewUser", usersController.addUser);
router.post("/login", usersController.loginUser);
router.get("/logout", usersController.logoutUser);
router.put("/editUserInformation/:userName", verifyAndRefreshAccessToken, usersController.editUser);
router.post("/getUserInformation", verifyAndRefreshAccessToken , usersController.getUserInformation);
router.get("/oAuth", verifyAndRefreshAccessToken, usersController.verifyIsLoggedIn);

module.exports = router;
