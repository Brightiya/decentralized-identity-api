// backend/src/index.js
import express from "express";
import cors from "cors";
import "./config/env.js";
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
// Option 1: SIMPLE - Mount all GSN routes without auth for now (easier to test)
import gsnRoutes from "./routes/gsnRoutes.js";
// Middleware
import { authMiddleware } from "../middleware/auth.js";

// Only import lightweight helpers — NOT the contract instance
import { isHybridMode } from "./utils/contract.js";

const app = express();

app.disable('etag');

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
    env: process.env.NODE_ENV || 'development',
    hybridSigning: isHybridMode() ? 'enabled (frontend signs)' : 'disabled (backend signs)'
  });
});

app.get('/api/health', (req, res) => res.sendStatus(200));

// Auth endpoints (public - anyone can request challenge / verify)
app.get('/api/auth/challenge', getChallenge);
app.post('/api/auth/verify', verifySignature);

// ────────────────────────────────────────────────
// GSN Routes (some public, some protected)
// ────────────────────────────────────────────────


app.use("/gsn", gsnRoutes);

// Option 2: OR if you want to separate public vs protected GSN routes:
/*
import gsnRoutes from "./routes/gsnRoutes.js";

// Create separate routers for public vs protected GSN routes
const gsnPublicRouter = express.Router();
const gsnProtectedRouter = express.Router();

// Public GSN routes
gsnPublicRouter.get('/config', (req, res, next) => {
  import('./controllers/gsnController.js')
    .then(module => module.getGSNConfig(req, res, next))
    .catch(next);
});

gsnPublicRouter.get('/status', (req, res, next) => {
  import('./controllers/gsnController.js')
    .then(module => module.getGSNStatus(req, res, next))
    .catch(next);
});

gsnPublicRouter.get('/whitelist/:address', (req, res, next) => {
  import('./controllers/gsnController.js')
    .then(module => module.checkGSNWhitelist(req, res, next))
    .catch(next);
});

// Protected GSN routes (require auth)
gsnProtectedRouter.use(authMiddleware);
// Mount the remaining gsnRoutes (prepare-* endpoints) under protected router
const { Router } = express;
const gsnSubRoutes = Router();
// You'd need to modify gsnRoutes to only have the protected routes
// or extract them differently

// Mount both
app.use("/gsn", gsnPublicRouter);
app.use("/gsn", gsnProtectedRouter);
*/

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
// eslint-disable-next-line no-unused-vars
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
  console.log(`Signing mode: ${isHybridMode() ? 'Hybrid (frontend signs)' : 'Backend (PRIVATE_KEY)'}`);
  console.log(`Auth endpoints: /api/auth/challenge, /api/auth/verify`);
  console.log(`Protected APIs: /api/vc, /api/profile, etc.`);
  console.log(`GSN endpoints: /gsn/*`);
});