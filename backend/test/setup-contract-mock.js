// backend/test/setup-contract-mock.js
import { jest } from '@jest/globals';
import { ethers } from "ethers";

// State
const profileCids = new Map();
const claims = new Map();

const normalizeAddress = (addr) => (addr || '').toLowerCase();

const mockContract = {
  target: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  getProfileCID: jest.fn(async (address) => profileCids.get(normalizeAddress(address)) || ethers.ZeroHash),
  getClaim: jest.fn(async (address, claimIdBytes32) => {
    const key = `${normalizeAddress(address)}:${claimIdBytes32}`;
    return claims.get(key) || ethers.ZeroHash;
  }),
  // No write methods - hybrid mode doesn't call them
};

// Force hybrid mode globally for tests
jest.unstable_mockModule('../src/utils/contract.js', () => {
  return {
    isHybridMode: jest.fn(() => true), // FORCE HYBRID - no backend signing

    prepareUnsignedTx: jest.fn(async (methodName, ...args) => {
      console.log('[MOCK] prepareUnsignedTx:', methodName, args);
      // Simulate state update (as if tx was mined later)
      if (methodName === 'setProfileCID') {
        const [addr, cid] = args;
        profileCids.set(normalizeAddress(addr), cid);
      } else if (methodName === 'setClaim') {
        const [addr, id, hash] = args;
        claims.set(`${normalizeAddress(addr)}:${id}`, hash);
      }
      return {
        to: mockContract.target,
        data: '0xmockdata',
        gasLimit: '450000'
      };
    }),

    default: mockContract,
    contract: mockContract,
  };
});

// Also mock ethers.Contract (for safety)
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    Contract: jest.fn(() => mockContract),
  };
});

console.log('[TEST SETUP] Forced HYBRID MODE + mocked contract');