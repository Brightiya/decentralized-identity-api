// backend/test/testServer.js
process.env.NODE_ENV = "test";
//import "../src/config/env.js";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { getChallenge, verifySignature } from "../src/controllers/authController.js";

import vcRoutes from "../src/routes/vcRoutes.js";
import profileRoutes from "../src/routes/profileRoutes.js";
import didRoutes from "../src/routes/didRoutes.js";
import gdprRoutes from "../src/routes/gdprRoutes.js";
import disclosureRoutes from "../src/routes/disclosureRoutes.js";
import consentRoutes from "../src/routes/consentRoutes.js";
import testRoutes from "../src/routes/routeTest.js";

import { authMiddleware } from "../middleware/auth.js";

const app = express();

app.disable('etag');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Cache prevention (copy from real app)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/profile/') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  if (req.path.startsWith('/api/consent/') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Public routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/api/health', (req, res) => res.sendStatus(200));

// Auth
app.get('/api/auth/challenge', getChallenge);
app.post('/api/auth/verify', verifySignature);

// Protected under /api
const apiRouter = express.Router();
apiRouter.use(authMiddleware);

apiRouter.use("/vc", vcRoutes);
apiRouter.use("/profile", profileRoutes);
apiRouter.use("/did", didRoutes);

app.use("/api", apiRouter);

// Public (no auth) - matching real app
app.use("/", testRoutes);
app.use("/gdpr", gdprRoutes);
app.use("/disclosures", disclosureRoutes);
app.use("/consent", consentRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

export default app;