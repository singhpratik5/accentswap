const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.send("Video call service is running.");
});

module.exports = router;