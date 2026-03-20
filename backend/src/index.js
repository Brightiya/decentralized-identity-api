import express from "express"; // Express framework for building the API server
import path from "path"; // Utility for handling file paths
import cors from "cors"; // Middleware to enable Cross-Origin Resource Sharing
import "./config/env.js"; // Load environment variables
import morgan from "morgan"; // HTTP request logger middleware
import contact from './routes/contact.js'; // Contact route handler
import { forceEnglishContentLanguage } from '../middleware/contentNegotiation.js'; // Custom middleware for language enforcement

// Define __dirname for ES Modules (not needed here but typically required in ES modules)

const app = express(); // Initialize Express application

// Controllers
import { getChallenge, verifySignature } from './controllers/authController.js'; // Authentication handlers

// Routes (modular route handlers)
import vcRoutes from "./routes/vcRoutes.js"; // Verifiable Credential routes
import profileRoutes from "./routes/profileRoutes.js"; // Profile management routes
import didRoutes from "./routes/didRoutes.js"; // DID (Decentralized Identifier) routes
import gdprRoutes from "./routes/gdprRoutes.js"; // GDPR-related routes
import disclosureRoutes from "./routes/disclosureRoutes.js"; // Disclosure/audit routes
import consentRoutes from "./routes/consentRoutes.js"; // Consent management routes
// Option 1: SIMPLE - Mount all meta routes without auth for now (easier to test)
import gsnRoutes from "./routes/meta.js"; // Meta-transaction (gasless) routes

// Middleware
import { authMiddleware } from "../middleware/auth.js"; // JWT authentication middleware

// Only import lightweight helpers — NOT the contract instance
import { isHybridMode } from "./utils/contract.js"; // Utility to check signing mode



// Disable ETag headers to prevent client-side caching inconsistencies
app.disable('etag');

// ────────────────────────────────────────────────
// Middleware Setup
// ────────────────────────────────────────────────

// Enable CORS with frontend origin restriction
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200', // Restrict in production
  credentials: true, // Allow cookies/auth headers
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies (e.g., form submissions)
app.use(express.urlencoded({ extended: true }));

// Force all responses to use English content language
app.use(forceEnglishContentLanguage);

// Optional: request logging (disabled during tests)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev')); // Logs HTTP requests in development-friendly format
}

// PERMANENT CACHE FIX: Prevent caching of profile endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/profile/') && req.method === 'GET') {
    // Disable caching for sensitive profile data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// PERMANENT CACHE FIX: Also prevent caching on consent endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/consent/') && req.method === 'GET') {
    // Disable caching for consent-related data (privacy-sensitive)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Path where Angular frontend build is served from (Docker deployment)
const frontendBuildPath = '/app/frontend/dist/angular-src';

// Serve static frontend files (Angular app)
app.use(express.static(frontendBuildPath));

// ────────────────────────────────────────────────
// Public Routes (no auth required)
// ────────────────────────────────────────────────

// Health check endpoint (returns system status and configuration info)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(), // Server uptime
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    hybridSigning: isHybridMode() ? 'enabled (frontend signs)' : 'disabled (backend signs)'
  });
});

// Lightweight health check for API monitoring
app.get('/api/health', (req, res) => res.sendStatus(200));

// Auth endpoints (public - no authentication required)
app.get('/api/auth/challenge', getChallenge); // Generate authentication challenge
app.post('/api/auth/verify', verifySignature); // Verify signed challenge
app.post('/api/contact', contact); // Contact form submission endpoint

// ────────────────────────────────────────────────
// META Routes (some public, some protected)
// ────────────────────────────────────────────────

// Mount meta-transaction routes (gasless transactions support)
app.use("/meta", gsnRoutes);

// ────────────────────────────────────────────────
// Protected API Routes (JWT auth required)
// ────────────────────────────────────────────────

// Create router for protected endpoints
const apiRouter = express.Router();

// Apply authentication middleware to all routes below
apiRouter.use(authMiddleware);

// Mount feature-specific routes
apiRouter.use("/vc", vcRoutes); // Verifiable credentials
apiRouter.use("/profile", profileRoutes); // User profiles
apiRouter.use("/did", didRoutes); // DID operations
apiRouter.use("/gdpr", gdprRoutes); // GDPR actions (e.g., erasure)
apiRouter.use("/disclosures", disclosureRoutes); // Disclosure logs
apiRouter.use("/consent", consentRoutes); // Consent management

// Mount protected routes under /api prefix
app.use("/api", apiRouter);

// ────────────────────────────────────────────────
// Global Error Handler (last middleware)
// ────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log full error details for debugging
  console.error('❌ Global error:', err.stack || err.message);
  
  const status = err.status || 500;

  // Hide internal errors in production
  const message = status === 500 
    ? 'Internal server error' 
    : (err.message || 'Something went wrong');

  // Send structured error response
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }) // Include stack in dev only
  });
});

// ────────────────────────────────────────────────
// SPA FALLBACK 
// ────────────────────────────────────────────────

// Catch-all route to support Angular client-side routing
app.get('*', (req, res) => {
  // If requesting a static file that doesn't exist, return 404
  if (req.path.includes('.')) {
    return res.status(404).send('File not found');
  }

  // Otherwise, return index.html for Angular routing
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send("Frontend build not found. Check Docker paths.");
    }
  });
});

// ────────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────────

// Define server port (default 8080)
const PORT = process.env.PORT || 8080;

// Start Express server and listen on all network interfaces
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Signing mode: ${isHybridMode() ? 'Hybrid (frontend signs)' : 'Backend (PRIVATE_KEY)'}`);
  console.log(`Auth endpoints: /api/auth/challenge, /api/auth/verify`);
  console.log(`Protected APIs: /api/vc, /api/profile, etc.`);
});