const express = require("express");
const router = express.Router();

// Підключаємо підмаршрути
router.use("/auth", require("./auth"));
router.use("/cars", require("./cars"));

module.exports = router;