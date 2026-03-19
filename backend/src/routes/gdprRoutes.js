import express from "express";
import { eraseProfile } from "../controllers/gdprController.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

router.delete("/erase",  eraseProfile);

export default router;
