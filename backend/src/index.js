import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import identityRoutes from "./routes/didRoutes.js";
//import vcRoutes from "./routes/vcRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
//import didRoutes from "./routes/didRoutes.js";
import gdprRoutes from "./routes/gdprRoutes.js";
import disclosureRoutes from "./routes/disclosureRoutes.js";
import erasureRoutes from "./routes/erasureRoutes.js";
import consentRoutes from "./routes/consentRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// API routes
//app.use("/api/identity", identityRoutes);
//app.use("/api/vc", vcRoutes);
app.use("/api/profile", profileRoutes);
//app.use("/api/did", didRoutes);
app.use("/api/gdpr", gdprRoutes);
app.use("/api/disclosures", disclosureRoutes);
app.use("/api/erasure", erasureRoutes);
app.use("/api/consent", consentRoutes);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
