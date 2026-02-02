// backend/test/testHelpers.js
import request from 'supertest';
import app from './testServer.js';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

const TEST_PRIVATE_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // Hardhat #2
export async function getValidJwtFor(address) {
  const lowerAddress = address.toLowerCase();
  const wallet = new ethers.Wallet(TEST_PRIVATE_KEY);

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;

    // Fresh challenge EVERY time
    const challengeRes = await request(app)
      .get('/api/auth/challenge')
      .query({ address: lowerAddress });

    if (challengeRes.status !== 200) {
      throw new Error(`Challenge failed: ${challengeRes.status}`);
    }

    const { message } = challengeRes.body;
    const signature = await wallet.signMessage(message);

    const verifyRes = await request(app)
      .post('/api/auth/verify')
      .send({ message, signature, requestedRole: 'USER' });

    if (verifyRes.status === 200) {
      const realToken = verifyRes.body.token;

      // Your override logic (good!)
      const decoded = jwt.decode(realToken);
      const testPayload = {
        ...decoded,
        ethAddress: lowerAddress,
        role: decoded.role || 'USER',
        userId: decoded.userId || 1
      };
      const testToken = jwt.sign(testPayload, process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod-please');

      console.log('[TEST] Generated test token for', lowerAddress, ':', testToken.substring(0, 50) + '...');
      return testToken;
    }

    // If 401 → nonce race → retry
    if (verifyRes.status === 401 && attempts < maxAttempts) {
      console.warn(`[getValidJwtFor] Nonce race detected (attempt ${attempts}) - retrying...`);
      await new Promise(r => setTimeout(r, 150)); // tiny delay
      continue;
    }

    throw new Error(`Verify failed after ${attempts} attempts: ${verifyRes.status} - ${JSON.stringify(verifyRes.body)}`);
  }
  throw new Error(`Failed to get valid JWT after ${maxAttempts} attempts`);
}