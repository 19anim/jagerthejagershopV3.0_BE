const suid = require("rand-token").suid;
const userModel = require("../../model/user.model");
const { handleUpdate } = require("../../telegram/bot");

const LINK_CODE_TTL_MS = 10 * 60 * 1000;

const telegramController = {
  generateLinkCode: async (req, res) => {
    try {
      const code = suid(6);
      await userModel.updateOne(
        { _id: req.user._id },
        {
          telegramLinkCode: code,
          telegramLinkCodeExpiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
        }
      );
      return res.status(200).json({ code, expiresInMinutes: LINK_CODE_TTL_MS / 60000 });
    } catch (error) {
      return res.status(500).json({ errorMessage: error.message });
    }
  },

  webhook: async (req, res) => {
    try {
      await handleUpdate(req.body);
    } catch (error) {
      console.error("Telegram webhook handling failed:", error.message);
    }
    return res.sendStatus(200);
  },
};

module.exports = telegramController;
