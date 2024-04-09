const userModel = require("../../model/user.model");
const roleModel = require("../../model/role.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const suid = require("rand-token").suid;
const SALT_ROUNDS = 10;
const accessTokenUtil = require("../../utils/accessToken.utils");
const mongoose = require("mongoose");
const NORMAL_USER_ROLE = "NORMAL_USER";

const userController = {
  addUser: async (req, res) => {
    try {
      const userInfor = req.body;
      const isUserExist = await userModel.findOne({
        userName: userInfor.userName,
      });
      if (isUserExist) {
        res.status(409).json("This user is existed");
      } else {
        let refreshToken = suid(16);
        const hashPassword = bcrypt.hashSync(req.body.password, SALT_ROUNDS);
        const role = !req.body.role
          ? await roleModel.findOne({ role: NORMAL_USER_ROLE })
          : await roleModel.findOne({ role: req.body.role });
        const userInforToSave = {
          email: userInfor.email,
          userName: userInfor.userName,
          password: hashPassword,
          receipentName: "",
          address: "",
          ward: "",
          district: "",
          city: "",
          phoneNumber: "",
          roles: [role._id],
          refreshToken: refreshToken,
        };
        const newUser = new userModel(userInforToSave);
        const savedUserInfor = await newUser.save();
        await role.updateOne({ $push: { users: savedUserInfor.id } });
        res.status(200).json("User is create successfully");
      }
    } catch (error) {
      res.status(500).json(error);
    }
  },

  loginUser: async (req, res) => {
    try {
      const loginInfor = req.body;
      const userInfor = await userModel.findOne({
        userName: loginInfor.userName,
      });
      if (!userInfor) {
        return res.status(401).json("Wrong username or password");
      }

      const isPasswordValid = bcrypt.compareSync(
        loginInfor.password,
        userInfor.password
      );

      if (!isPasswordValid) {
        return res.status(401).json("Wrong username or password");
      }
      const refreshToken = userInfor.refreshToken;
      const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;
      const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
      const accessToken = accessTokenUtil.createAccessToken(
        loginInfor.userName,
        accessTokenSecret,
        accessTokenLife
      );
      if (!accessToken) {
        return res
          .status(401)
          .json("Something went wrong when trying to login, please try again");
      }
      res.cookie("access_token", accessToken, {
        maxAge: 1000 * 60 * 60 * 24 * 7, //Cookie expire in 7 days
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: 'https://jagerthejagershop.netlify.app/'
      });
      res.cookie("refresh_token", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24 * 7, //Cookie expire in 7 days
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: 'https://jagerthejagershop.netlify.app/'
      });
      res.status(200).json({
        message: "Login successfully",
        userName: userInfor.userName,
        email: userInfor.email,
        accessToken: accessToken,
        refreshToken: userInfor.refreshToken
          ? userInfor.refreshToken
          : refreshToken,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  logoutUser: async (req, res) => {
    try {
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      res.status(200).json("Logout Successfully");
    } catch (error) {
      res.status(500).json(error);
    }
  },

  editUser: async (req, res) => {
    try {
      if (res.locals.refreshedAccessToken) {
        res.cookie("access_token", res.locals.refreshedAccessToken, {
          maxAge: 1000 * 60 * 60 * 24 * 7, //Cookie expire in 7 days
          httpOnly: true,
          sameSite: "none",
          secure: true,
          domain: 'https://jagerthejagershop.netlify.app/'
        });
      }
      const {
        phoneNumber,
        receipentName,
        address,
        ward,
        district,
        city,
        email,
      } = req.body;
      const user = userModel.find({ userName: req.params.userName });
      const savedNewUser = await user.updateOne({
        phoneNumber: phoneNumber,
        receipentName: receipentName,
        email: email,
        address: address,
        ward: ward,
        district: district,
        city: city,
      });
      console.log("Update Done");
      res.status(200).json(savedNewUser);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  getUserInformation: async (req, res) => {
    try {
      if (res.locals.refreshedAccessToken) {
        res.cookie("access_token", res.locals.refreshedAccessToken, {
          maxAge: 1000 * 60 * 60 * 24 * 7, //Cookie expire in 7 days
          httpOnly: true,
          sameSite: "none",
          secure: true,
          domain: 'https://jagerthejagershop.netlify.app/'
        });
      }
      const userName = req.body.userName;
      let userInfor = await userModel.findOne({ userName: userName }).lean().populate("roles");
      if (userInfor) {
        delete userInfor.password;
        delete userInfor.refreshToken;
        delete userInfor._id;
        delete userInfor.__v;
      }
      return res.status(200).json(userInfor);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  verifyIsLoggedIn: async (req, res) => {
    console.log(req.cookies.refresh_token);
    console.log(req.cookies.access_token);
    try {
      if (
        req.cookies.refresh_token == "" ||
        req.cookies.refresh_token == undefined ||
        req.cookies.access_token == undefined ||
        req.cookies.access_token == ""
      ) {
        return res.status(401).json({
          isLoggedIn: false,
        });
      }
      const userInfor = await userModel
        .findOne({
          refreshToken: req.cookies.refresh_token,
        })
        .lean();
      if (userInfor) {
        delete userInfor.password;
        delete userInfor.roles;
        delete userInfor.refreshToken;
        delete userInfor._id;
        delete userInfor.__v;
        return res.status(200).json({
          isLoggedIn: true,
          userInfor: userInfor,
        });
      } else {
        return res.status(401).json({
          isLoggedIn: false,
        });
      }
    } catch (error) {
      res.status(500).json({
        isLoggedIn: false,
      });
    }
  },
};

module.exports = userController;
