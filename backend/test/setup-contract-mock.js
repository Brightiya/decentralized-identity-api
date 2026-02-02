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

  // IMPORTANT:
  // No write methods here — hybrid mode never calls them directly
};

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
