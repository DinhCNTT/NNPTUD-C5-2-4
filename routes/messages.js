var express = require("express");
var router = express.Router();
const messageModel = require("../schemas/messages");
const { checkLogin } = require("../utils/authHandler");
const { uploadImage } = require("../utils/uploadHandler");

// GET "/" - Lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin
router.get("/", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;

        let lastMessages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUserId },
                        { to: currentUserId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $addFields: {
                    partner: {
                        $cond: {
                            if: { $eq: ["$from", currentUserId] },
                            then: "$to",
                            else: "$from"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$partner",
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: { newRoot: "$lastMessage" }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        // Populate from và to
        lastMessages = await messageModel.populate(lastMessages, [
            { path: "from", select: "username email avatarUrl" },
            { path: "to", select: "username email avatarUrl" }
        ]);

        res.send(lastMessages);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// GET "/:userID" - Lấy toàn bộ message giữa user hiện tại và userID
router.get("/:userID", checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let otherUserId = req.params.userID;

        let messages = await messageModel
            .find({
                $or: [
                    { from: currentUserId, to: otherUserId },
                    { from: otherUserId, to: currentUserId }
                ]
            })
            .sort({ createdAt: 1 })
            .populate("from", "username email avatarUrl")
            .populate("to", "username email avatarUrl");

        res.send(messages);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// POST "/" - Gửi tin nhắn (text hoặc file)
router.post("/", checkLogin, uploadImage.single("file"), async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let toUserId = req.body.to;

        if (!toUserId) {
            return res.status(400).send({ message: "Thiếu trường 'to' (userID người nhận)" });
        }

        let messageContent;

        if (req.file) {
            // Nếu có file đính kèm -> type = "file", text = đường dẫn file
            messageContent = {
                type: "file",
                text: req.file.path
            };
        } else if (req.body.text) {
            // Nếu không có file -> type = "text", text = nội dung tin nhắn
            messageContent = {
                type: "text",
                text: req.body.text
            };
        } else {
            return res.status(400).send({ message: "Thiếu nội dung tin nhắn (text hoặc file)" });
        }

        let newMessage = new messageModel({
            from: currentUserId,
            to: toUserId,
            messageContent: messageContent
        });

        await newMessage.save();

        let populated = await messageModel
            .findById(newMessage._id)
            .populate("from", "username email avatarUrl")
            .populate("to", "username email avatarUrl");

        res.send(populated);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;
