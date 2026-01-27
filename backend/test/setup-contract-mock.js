// backend/test/setup-contract-mock.js
import { jest } from '@jest/globals';
import { ethers } from "ethers"; // needed for ethers.ZeroHash

// Per-address state: address → last uploaded profile CID
const profileCids = new Map(); // string (address) → string (CID)

jest.unstable_mockModule('../src/utils/contract.js', () => {
  const mockContractInstance = {
    target: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // fake contract address

    getProfileCID: jest.fn(async (address) => {
      const addr = address.toLowerCase();
      console.log('[MOCK contract] getProfileCID called for:', addr);
      return profileCids.get(addr) || ethers.ZeroHash;
    }),

    setProfileCID: jest.fn(async (address, cid) => {
      const addr = address.toLowerCase();
      console.log('[MOCK contract] setProfileCID mocked call:', { address: addr, cid });
      profileCids.set(addr, cid);
      console.log('[MOCK contract] Stored profile CID for', addr, ':', cid);
      return { hash: '0xmocktxhash_setProfileCID' };
    }),

    setClaim: jest.fn(async (...args) => {
      console.log('[MOCK contract] setClaim mocked call:', args);
      return { hash: '0xmocktxhash_setClaim' };
    }),

    // Add any other contract methods your code calls
  };

  return {
    isHybridMode: jest.fn(() => true),

    prepareUnsignedTx: jest.fn(async (methodName, ...args) => {
      console.log('[MOCK contract] prepareUnsignedTx called:', methodName, args);
      if (methodName === 'setProfileCID') {
        const addr = args[0].toLowerCase(); // first arg = subjectAddress
        const cid = args[1];
        profileCids.set(addr, cid);
        console.log('[MOCK contract] Stored new profile CID for', addr, ':', cid);
      }
      return {
        to: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        nonce: '(let frontend resolve)',
        gasLimit: '400000'
      };
    }),

    // Critical: provide both default and named export
    default: mockContractInstance,
    contract: mockContractInstance,
  };
});

console.log('[TEST SETUP] Contract mocked with per-address stateful profile CID');