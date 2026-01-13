// backend/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan"; // optional: nice request logging

// Controllers
import { getChallenge, verifySignature } from './controllers/authController.js';

// Routes
import vcRoutes from "./routes/vcRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import didRoutes from "./routes/didRoutes.js";
import gdprRoutes from "./routes/gdprRoutes.js";
import disclosureRoutes from "./routes/disclosureRoutes.js";
import consentRoutes from "./routes/consentRoutes.js";

// Middleware
import { authMiddleware } from "../middleware/auth.js";

dotenv.config();

const app = express();

// ────────────────────────────────────────────────
// Middleware Setup
// ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200', // ← restrict in prod
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: request logging (great for dev)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev')); // tiny, colorful logs
}

// PERMANENT CACHE FIX: Prevent caching of profile endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/profile/') && req.method === 'GET') {
    // No caching for profile reads (prevents stale 403/empty responses)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// PERMANENT CACHE FIX: Also prevent caching on consent endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/consent/') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
// ────────────────────────────────────────────────
// Public Routes (no auth required)
// ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => res.sendStatus(200));

// Auth endpoints (public - anyone can request challenge / verify)
app.get('/api/auth/challenge', getChallenge);
app.post('/api/auth/verify', verifySignature);

// ────────────────────────────────────────────────
// Protected API Routes (JWT auth required)
// ────────────────────────────────────────────────
const apiRouter = express.Router();
apiRouter.use(authMiddleware); // ← applies to all below

apiRouter.use("/vc", vcRoutes);
apiRouter.use("/profile", profileRoutes);
apiRouter.use("/did", didRoutes);
apiRouter.use("/gdpr", gdprRoutes);
apiRouter.use("/disclosures", disclosureRoutes);
apiRouter.use("/consent", consentRoutes);

// Mount protected APIs under /api
app.use("/api", apiRouter);

// ────────────────────────────────────────────────
// Global Error Handler (last middleware)
// ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.stack || err.message);
  
  const status = err.status || 500;
  const message = status === 500 
    ? 'Internal server error' 
    : (err.message || 'Something went wrong');

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ────────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ PIMV Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Auth endpoints: /api/auth/challenge, /api/auth/verify`);
  console.log(`Protected APIs: /api/vc, /api/profile, etc.`);
});