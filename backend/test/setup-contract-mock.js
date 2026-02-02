// backend/test/setup-contract-mock.js
import { jest } from '@jest/globals';
import { ethers } from "ethers";

// ────────────────────────────────────────────────
// In-memory mock state
// ────────────────────────────────────────────────
const profileCids = new Map();
const claims = new Map();

const normalizeAddress = (addr) => (addr || '').toLowerCase();

// ────────────────────────────────────────────────
// Mock contract (READ-ONLY in hybrid mode)
// ────────────────────────────────────────────────
const mockContract = {
  target: '0x5FbDB2315678afecb367f032d93F642f64180aa3',

  getProfileCID: jest.fn(async (address) => {
    return profileCids.get(normalizeAddress(address)) || ethers.ZeroHash;
  }),

  getClaim: jest.fn(async (address, claimIdBytes32) => {
    const key = `${normalizeAddress(address)}:${claimIdBytes32}`;
    return claims.get(key) || ethers.ZeroHash;
  }),

  // ← Add these write methods so registerDID can "succeed" in tests
  setProfileCID: jest.fn(async (address, cid) => {
    profileCids.set(normalizeAddress(address), cid);
    return { hash: `0xmocktx_${Date.now()}` }; // fake tx hash
  }),

  setClaim: jest.fn(async (address, id, hash) => {
    claims.set(`${normalizeAddress(address)}:${id}`, hash);
    return { hash: `0xmocktx_${Date.now()}` };
  }),
  // IMPORTANT:
  // No write methods here — hybrid mode never calls them directly
};

// ────────────────────────────────
// CRITICAL: Set global for didController.js to find it
// ────────────────────────────────
globalThis.mockContract = mockContract;
// ────────────────────────────────────────────────
// Mock utils/contract.js completely
// ────────────────────────────────────────────────
jest.unstable_mockModule('../src/utils/contract.js', () => {
  return {
    // Force HYBRID MODE for ALL tests
    isHybridMode: jest.fn(() => true),

    // Mock unsigned tx preparation
    prepareUnsignedTx: jest.fn(async (methodName, ...args) => {
      // Simulate state change as if tx were mined later
      if (methodName === 'setProfileCID') {
        const [addr, cid] = args;
        profileCids.set(normalizeAddress(addr), cid);
      }

      if (methodName === 'setClaim') {
        const [addr, id, hash] = args;
        claims.set(`${normalizeAddress(addr)}:${id}`, hash);
      }

      return {
        to: mockContract.target,
        data: '0xmockdata',
        gasLimit: '450000',
      };
    }),

    // Default export AND named export must both be mocked
    getContract: jest.fn(() => mockContract),
    default: mockContract,
    contract: mockContract,
  };
});

console.log('[TEST SETUP] HYBRID_MODE forced + contract fully mocked');
