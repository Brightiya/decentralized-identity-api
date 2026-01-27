// backend/test/setup-pinata-mock.js
import { jest } from '@jest/globals';

// In-memory storage for uploaded content
const pinataStorage = new Map(); // cid → content

// Mock @pinata/sdk (optional, if you still use it directly)
jest.unstable_mockModule('@pinata/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    pinJSONToIPFS: jest.fn(async (json) => {
      const cid = `QmMockTestCid_${Date.now()}`;
      pinataStorage.set(cid, json);
      console.log('[MOCK SDK] Pinned JSON with CID:', cid);
      return { IpfsHash: cid };
    }),
    unpin: jest.fn(async () => true),
    pinFileToIPFS: jest.fn(async () => ({ IpfsHash: `QmMockFile_${Date.now()}` })),
  })),
}));



// Mock your own pinata wrapper (the one actually used in controllers)
jest.unstable_mockModule('../src/utils/pinata.js', () => {
  return {
    uploadJSON: jest.fn(async (json, jwt, nftKey) => {
      console.log('[MOCK wrapper] uploadJSON called with data:', JSON.stringify(json, null, 2));
      const cid = `QmMockTestCid_${Date.now()}`;
      pinataStorage.set(cid, json); // Remember what was uploaded
      return `ipfs://${cid}`;
    }),

    fetchJSON: jest.fn(async (cidOrUrl) => {
      const cid = cidOrUrl.replace('ipfs://', '').split('/')[0]; // clean up
      console.log('[MOCK wrapper] fetchJSON called for CID:', cid);

      const content = pinataStorage.get(cid);
      if (content) {
        console.log('[MOCK wrapper] Returning stored content for CID:', cid);
        return content;
      }

      // Fallback for unknown CID (e.g. test fake CIDs)
      console.log('[MOCK wrapper] No stored content → returning fallback DID doc');
      return {
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:ethr:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        verificationMethod: [{
          id: "#controller",
          type: "EcdsaSecp256k1RecoveryMethod2020",
          controller: "did:ethr:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
          blockchainAccountId: "eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
        }],
        authentication: ["#controller"],
        service: []
      };
    }),

    unpinCID: jest.fn(async (cid) => {
      console.log('[MOCK wrapper] unpinCID called for:', cid);
      pinataStorage.delete(cid);
      return true;
    })
  };
});

console.log('[TEST SETUP] Pinata SDK + wrapper FULLY MOCKED with stateful storage (ESM mode)');
