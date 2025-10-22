// backend/test/testServer.js
import "dotenv/config"; // ESM-compatible dotenv
import express from "express";
import bodyParser from "body-parser";
import didRoutes from "../src/routes/didRoutes.js";
import profileRoutes from "../src/routes/profileRoutes.js";
import vcRoutes from "../src/routes/vcRoutes.js";

const app = express();
app.use(bodyParser.json());
app.use("/api/did", didRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vc", vcRoutes);

export default app;
