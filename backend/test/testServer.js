// backend/test/testServer.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const didRoutes = require("../src/routes/didRoutes");
const profileRoutes = require("../src/routes/profileRoutes");
const vcRoutes = require("../src/routes/vcRoutes");

const app = express();
app.use(bodyParser.json());
app.use("/api/did", didRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vc", vcRoutes);

module.exports = app;
