// backend/test/setup-pinata-mock.js
import { jest } from '@jest/globals';

// In-memory storage: cid → content
const pinataStorage = new Map(); // string → any (usually object)

/**
 * Generate a deterministic-looking mock CID for tests
 * Uses timestamp + random suffix to avoid collisions in the same test run
 */
function generateMockCid(prefix = 'QmMockTestCid_') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
}

// ────────────────────────────────────────────────
// Mock the original @pinata/sdk (if any code still imports it directly)
jest.unstable_mockModule('@pinata/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    pinJSONToIPFS: jest.fn(async (json, options) => {
      const cid = generateMockCid();
      pinataStorage.set(cid, json);
      console.log('[MOCK SDK pinJSONToIPFS] Pinned JSON → CID:', cid);
      return { IpfsHash: cid };
    }),
    pinFileToIPFS: jest.fn(async (file, options) => {
      const cid = generateMockCid('QmMockFile_');
      console.log('[MOCK SDK pinFileToIPFS] Pinned file → CID:', cid);
      return { IpfsHash: cid };
    }),
    unpin: jest.fn(async (cid) => {
      pinataStorage.delete(cid);
      console.log('[MOCK SDK] Unpinned CID:', cid);
      return true;
    }),
  })),
}));

// ────────────────────────────────────────────────
// Mock the project's own Pinata wrapper (used by controllers)
jest.unstable_mockModule('../src/utils/pinata.js', () => {
  return {
    /**
     * @param {any} json - The content to "upload"
     * @param {string} [jwt] - Ignored in mock
     * @param {string|null} [nftKey] - Ignored in mock
     * @returns {Promise<string>} ipfs://CID
     */
    uploadJSON: jest.fn(async (json, jwt, nftKey) => {
      console.log('[MOCK wrapper] uploadJSON called with data:', JSON.stringify(json, null, 2));

      const cid = generateMockCid();
      pinataStorage.set(cid, json);

      console.log(`[MOCK wrapper] Stored content under CID: ${cid}`);

      // Optional: simulate network delay (uncomment for more realistic testing)
       await new Promise(r => setTimeout(r, 80 + Math.random() * 120));

      return `ipfs://${cid}`;
    }),

    /**
     * @param {string} cidOrUrl - ipfs://CID, /ipfs/CID, or bare CID
     * @returns {Promise<any>} The stored content or fallback DID doc
     */
    fetchJSON: jest.fn(async (cidOrUrl) => {
      // Normalize different possible CID formats
      let cid = cidOrUrl
        .replace(/^ipfs:\/\//i, '')
        .replace(/^\/ipfs\//i, '')
        .split('/')[0]          // take first segment after /ipfs/
        .split('?')[0];         // remove query params if any

      console.log('[MOCK wrapper] fetchJSON called for CID:', cid);

      const content = pinataStorage.get(cid);

      if (content) {
        console.log('[MOCK wrapper] Returning stored content for CID:', cid);
        return content;
      }

      console.log('[MOCK wrapper] No stored content → returning fallback DID document');

      return {
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
        verificationMethod: [{
          id: "#controller",
          type: "EcdsaSecp256k1RecoveryMethod2020",
          controller: "did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
          blockchainAccountId: "eip155:1:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase()
        }],
        authentication: ["#controller"],
        service: []
      };
    }),

    /**
     * @param {string} cid
     * @returns {Promise<boolean>}
     */
    unpinCID: jest.fn(async (cid) => {
      console.log('[MOCK wrapper] unpinCID called for:', cid);
      const existed = pinataStorage.delete(cid);
      return existed; // return true if something was actually removed
    })
  };
});

console.log('[TEST SETUP] Pinata SDK + custom wrapper FULLY MOCKED (stateful in-memory storage)');