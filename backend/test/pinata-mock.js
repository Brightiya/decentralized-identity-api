/** 
// backend/test/pinata-mock.js
import { jest } from '@jest/globals';

// Mock the entire Pinata SDK (for safety)
jest.mock('@pinata/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    pinJSONToIPFS: jest.fn().mockResolvedValue({
      IpfsHash: `QmMockTestCid_${Date.now()}`,
      PinSize: 256,
      Timestamp: new Date().toISOString()
    }),
    unpin: jest.fn().mockResolvedValue(true)
  }));
});

// Mock the utils/pinata.js functions completely
jest.mock('../src/utils/pinata.js', () => ({
  uploadJSON: jest.fn(async (json, pinataJwt, nftStorageKey) => {
    console.log('[TEST MOCK] uploadJSON called with data:', json);
    return `ipfs://QmMockTestCid_${Date.now()}`;
  }),

  fetchJSON: jest.fn(async (cidOrUrl) => {
    const cid = cidOrUrl.replace('ipfs://', '');
    console.log('[TEST MOCK] fetchJSON called for CID:', cid);

    // Return a fake DID document for verifyDID tests
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

  unpinCID: jest.fn(async () => true)
}));

console.log('[Jest] Pinata SDK & utils/pinata.js fully mocked for tests');
*/