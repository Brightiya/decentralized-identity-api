// backend/test/global-setup.js
import dotenv from 'dotenv';

export default async () => {
  // Load .env.test explicitly
  dotenv.config({ path: './backend/.env.test', override: true });
  
  console.log('[GLOBAL SETUP] Loaded .env.test → HYBRID_MODE:', process.env.HYBRID_MODE);
  
  // Optional: you can force it here if you prefer
   process.env.HYBRID_MODE = 'true';
};