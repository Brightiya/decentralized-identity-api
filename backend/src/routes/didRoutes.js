// backend/src/routes/didRoutes.js
import express from "express";
import { registerDID, resolveDID, verifyDID } from "../controllers/didController.js";

const router = express.Router();

router.post("/register", registerDID);
router.get("/:address", resolveDID);
router.post("/verify", verifyDID);

export default router;
