// backend/test/jest-dotenv-setup.js
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), 'backend', '.env.test');

config({ path: envPath, override: true });

process.env.PINATA_JWT = process.env.PINATA_JWT || "TEST_PINATA_JWT";


console.log('[Jest EARLY SETUP] Loaded .env.test from:', envPath);
console.log('[Jest EARLY SETUP] PRIVATE_KEY exists?', !!process.env.PRIVATE_KEY);
console.log('[Jest EARLY SETUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[Jest EARLY SETUP] HYBRID_MODE:', process.env.HYBRID_MODE || 'NOT SET');