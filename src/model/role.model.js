const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  ],
});

const Role = mongoose.model("Roles", RoleSchema);
module.exports = Role;
