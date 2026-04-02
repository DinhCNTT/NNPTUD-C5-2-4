var express = require("express");
var router = express.Router();
let { validatedResult, CreateUserValidator, ModifyUserValidator } = require("../utils/validator")
let userModel = require("../schemas/users");
let userController = require("../controllers/users");
const { checkLogin, checkRole } = require("../utils/authHandler");
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { sendPasswordMail } = require('../utils/mailHandler');
const { uploadExcel } = require('../utils/uploadHandler');
const roleModel = require('../schemas/roles');
const crypto = require('crypto');


router.get("/", checkLogin, checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  let users = await userModel
    .find({ isDeleted: false })
  res.send(users);
});

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CreateUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newUser = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email,
      req.body.role, req.body.fullname, req.body.avatarUrl
    )
    res.send(newUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.post("/import", uploadExcel.single('file'), async function (req, res, next) {
  try {
    let userRole = await roleModel.findOne({ name: 'USER' }) || await roleModel.findOne({ name: 'user' });
    if (!userRole) {
      userRole = new roleModel({ name: 'USER', description: 'Default user role' });
      await userRole.save();
    }

    let filePath;
    if (req.file) {
      filePath = req.file.path;
    } else {
      filePath = path.join(__dirname, '../user.xlsx');
      if (!fs.existsSync(filePath)) {
        return res.status(400).send({ message: "Vui lòng đính kèm file excel vào form-data với key 'file' hoặc để sẵn file user.xlsx ở thư mục gốc!" });
      }
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    let importedUsers = [];

    // Start from row 2 assuming row 1 has headers (username, email)
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      let usernameObj = row.values[1];
      let username = typeof usernameObj === 'object' && usernameObj !== null ? usernameObj.result : usernameObj;
      if (!username) continue; // Skip empty row
      username = String(username).trim();

      let emailObj = row.values[2];
      let email = typeof emailObj === 'object' && emailObj !== null ? emailObj.result : emailObj;
      if (!email) continue;
      email = String(email).trim().toLowerCase();

      // Check if user exists
      let existUser = await userModel.findOne({ username: username });
      if (existUser) continue; // Skip if exists

      let existEmail = await userModel.findOne({ email: email });
      if (existEmail) continue;

      let randomPassword = crypto.randomBytes(8).toString('hex'); // 16 characters

      try {
        let newUser = await userController.CreateAnUser(
          username, randomPassword, email, userRole._id, null, username, undefined, true, 0
        );
        importedUsers.push(newUser);

        // Send email
        await sendPasswordMail(email, randomPassword);
      } catch (err) {
        console.error(`Failed to process user ${username}:`, err.message);
      }
    }

    res.send({ message: "Import successful", importedCount: importedUsers.length, users: importedUsers });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

router.put("/:id", ModifyUserValidator, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;