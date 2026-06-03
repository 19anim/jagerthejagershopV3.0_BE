const userModel = require("../../model/user.model");
const roleModel = require("../../model/role.model");
const bcrypt = require("bcrypt");
const suid = require("rand-token").suid;
const SALT_ROUNDS = 10;
const accessTokenUtil = require("../../utils/accessToken.utils");
const NORMAL_USER_ROLE = "NORMAL_USER";
const {
  clearAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} = require("../../utils/authCookie.utils");

const sanitizeUser = (user) => {
  const userInfor = user.toObject ? user.toObject() : { ...user };
  delete userInfor.password;
  delete userInfor.refreshToken;
  delete userInfor.accessToken;
  delete userInfor._id;
  delete userInfor.__v;
  return userInfor;
};

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
        const refreshToken = suid(32);
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
      const refreshToken = suid(32);
      userInfor.refreshToken = refreshToken;
      await userInfor.save();
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
      setAccessTokenCookie(res, accessToken);
      setRefreshTokenCookie(res, refreshToken);
      res.status(200).json({
        message: "Login successfully",
        userName: userInfor.userName,
        email: userInfor.email,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  logoutUser: async (req, res) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await userModel.updateOne({ refreshToken }, { $set: { refreshToken: "" } });
      }
      clearAuthCookies(res);
      res.status(200).json("Logout Successfully");
    } catch (error) {
      res.status(500).json(error);
    }
  },

  editUser: async (req, res) => {
    try {
      const {
        phoneNumber,
        receipentName,
        address,
        ward,
        district,
        city,
        email,
      } = req.body;
      const savedNewUser = await userModel.updateOne({ _id: req.user._id }, {
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
      return res.status(200).json(sanitizeUser(req.user));
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  verifyIsLoggedIn: async (req, res) => {
    try {
      return res.status(200).json({
        isLoggedIn: true,
        userInfor: sanitizeUser(req.user),
      });
    } catch (error) {
      res.status(500).json({
        isLoggedIn: false,
      });
    }
  },
};

module.exports = userController;
