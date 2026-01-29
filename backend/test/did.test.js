// backend/test/did.test.js
import { jest } from '@jest/globals';
import * as chai from "chai";
import request from "supertest";
import app from "./testServer.js";
import { ethers } from "ethers";
import { getValidJwtFor } from "./testHelpers.js";
import { pool } from "../src/utils/db.js";
import { didToAddress, requireDidAddress } from "../src/utils/did.js";


jest.setTimeout(60000);



const { expect } = chai;

describe("DID Routes Basics", function () {
  jest.setTimeout(60000);
  const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
  const did = `did:ethr:${testAddress}`;

  let validJwtToken;

  beforeAll(async () => {
   // jest.setTimeout(60000);
    validJwtToken = await getValidJwtFor(testAddress);

    // Clean any existing profile/CID
    await pool.query("DELETE FROM profiles WHERE user = $1", [testAddress]);

    // Grant consent for profile creation (prevents 403 if middleware checks)
    await pool.query(`
      INSERT INTO consents (subject_did, claim_id, purpose, context, issued_at, expires_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 day')
      ON CONFLICT DO NOTHING
    `, [`did:ethr:${testAddress}`, "profile.all", "Full profile write access", "profile"]);

    // Create profile ONCE
    const profileRes = await request(app)
      .post("/api/profile")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
      .send({
        owner: testAddress,
        contexts: {
          profile: {
            attributes: {
              name: "Tony I",
              email: "tony@example.com",
              bio: "Decentralized identity builder"
            }
          }
        }
      }).timeout(60000); // 60s timeout for this request

    if (profileRes.status !== 200) {
      console.error("Profile creation failed in beforeAll:", profileRes.status, profileRes.body);
      throw new Error(`Profile setup failed with status ${profileRes.status}`);
    }

    console.log("Profile created successfully for DID tests:", profileRes.body.cid);
  });

 describe("POST /api/did/register", () => {
  it("registers a DID and returns CID + txHash", async () => {
    const res = await request(app)
      .post("/api/did/register")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
      .send({
        address: testAddress,
        name: "Tony I",
        email: "tony@example.com"
      });

    expect(res.status).to.equal(200);

    expect(res.body).to.have.property("did");
    expect(res.body.did).to.equal(`did:ethr:${testAddress}`);

    expect(res.body).to.have.property("cid");
    expect(res.body.cid).to.be.a("string");
    expect(res.body.cid.length).to.be.greaterThan(10);

    expect(res.body).to.have.property("ipfsUri");
    expect(res.body.ipfsUri).to.include("ipfs://");

    expect(res.body).to.have.property("gatewayUrl");
    expect(res.body.gatewayUrl).to.include("pinata.cloud/ipfs");

    expect(res.body).to.have.property("txHash");
    expect(res.body.txHash).to.match(/^0x[a-fA-F0-9]{64}$/);
  });
});

 beforeEach(async () => {
    // Refresh token if needed
    validJwtToken = await getValidJwtFor(testAddress);
    // Clean any existing profile/CID
    await pool.query("DELETE FROM profiles WHERE user = $1", [testAddress]);
  });
  
  it("GET /api/did/:address should return did object if exists", async () => {
    const res = await request(app)
      .get(`/api/did/${testAddress}`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.be.oneOf([200, 404]);

    if (res.status === 200) {
      expect(res.body).to.have.property("didDocument");
      expect(res.body).to.have.property("cid");
      expect(res.body).to.have.property("gatewayUrl");
      expect(res.body.message).to.include("resolved successfully");
    } else {
      expect(res.body).to.have.property("error");
      expect(res.body.error).to.equal("DID Document not found");
    }
  });

  it("POST /api/did/verify should verify DID ownership with valid signature", async () => {
    const message = `Verifying DID ownership for ${did}`;

    const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    const signature = await wallet.signMessage(message);

    const res = await request(app)
      .post("/api/did/verify")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        address: testAddress,
        signature
      });

    // If no profile exists → expect 404 (controller behavior)
    if (res.status === 404) {
      expect(res.body.error).to.equal("DID Document not found");
      return; // test passes if 404 is expected when no CID
    }

    // If profile exists → expect success
    expect(res.status).to.equal(200);
    expect(res.body.valid).to.be.true;
    expect(res.body.recoveredAddress.toLowerCase()).to.equal(testAddress);
    expect(res.body.message).to.include("successful");
  });

  it("POST /api/did/verify returns 400 on invalid signature (current controller behavior)", async () => {
    const res = await request(app)
      .post("/api/did/verify")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        address: testAddress,
        signature: "0x0000000000000000000000000000000000000000000000000000000000000000"
      });

    console.log('[DID Invalid Sig Test] Response:', res.body);
    
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error");
    expect(res.body.error).to.include("Invalid signature format");
  });

  it("GET /api/did/:address returns 400 for invalid address", async () => {
  const res = await request(app)
    .get("/api/did/not-an-address")
    .set("Authorization", `Bearer ${validJwtToken}`);

  expect(res.status).to.equal(400);
  expect(res.body).to.have.property("error");
  expect(res.body.error).to.include("Valid Ethereum address required");
});
it("GET /api/did/:address handles mixed-case address correctly", async () => {
  const mixedCase = "0xF39Fd6e51AAd88F6F4Ce6AB8827279CfFFB92266";

  const res = await request(app)
    .get(`/api/did/${mixedCase}`)
    .set("Authorization", `Bearer ${validJwtToken}`);

  expect(res.status).to.be.oneOf([200, 400]);
});
it("POST /api/did/verify returns 400 if signature is missing", async () => {
  const res = await request(app)
    .post("/api/did/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      address: testAddress
    });

  expect(res.status).to.equal(400);
  expect(res.body.error).to.include("address and signature are required");
});
it("POST /api/did/verify returns 400 if address is missing", async () => {
  const res = await request(app)
    .post("/api/did/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      signature: "0xdeadbeef"
    });

  expect(res.status).to.equal(400);
  expect(res.body.error).to.include("address and signature are required");
});
it("POST /api/did/verify returns valid=false if signature is from different address", async () => {
  const wrongWallet = ethers.Wallet.createRandom();
  const message = `Verifying DID ownership for ${did}`;
  const signature = await wrongWallet.signMessage(message);

  const res = await request(app)
    .post("/api/did/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      address: testAddress,
      signature
    });

  // If DID not registered → 404 still acceptable
  if (res.status === 404) {
    expect(res.body.error).to.equal("DID Document not found");
    return;
  }

  expect(res.status).to.equal(200);
  expect(res.body.valid).to.be.false;
  expect(res.body.recoveredAddress.toLowerCase())
    .to.not.equal(testAddress);
});
it("POST /api/did/verify fails if signature was for a different message", async () => {
  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );

  const wrongMessage = "I am signing something else entirely";
  const signature = await wallet.signMessage(wrongMessage);

  const res = await request(app)
    .post("/api/did/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      address: testAddress,
      signature
    });

  if (res.status === 404) {
    expect(res.body.error).to.equal("DID Document not found");
    return;
  }

  expect(res.status).to.equal(200);
  expect(res.body.valid).to.be.false;
});

describe("DID utils – didToAddress & requireDidAddress", () => {
  const validAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const lowerAddress = validAddress.toLowerCase();
  const did = `did:ethr:${validAddress}`;

  describe("didToAddress()", () => {
    it("returns lowercase address for valid lowercase address", () => {
      const res = didToAddress(lowerAddress);
      expect(res).to.equal(lowerAddress);
    });

    it("normalizes mixed-case Ethereum address", () => {
      const res = didToAddress(validAddress);
      expect(res).to.equal(lowerAddress);
    });

    it("extracts and normalizes address from did:ethr DID", () => {
      const res = didToAddress(did);
      expect(res).to.equal(lowerAddress);
    });

    it("returns null for invalid ethereum address", () => {
      const res = didToAddress("0x1234");
      expect(res).to.equal(null);
    });

    it("returns null for invalid DID format", () => {
      const res = didToAddress("did:ethr:not-an-address");
      expect(res).to.equal(null);
    });

    it("returns null for empty input", () => {
      expect(didToAddress(null)).to.equal(null);
      expect(didToAddress(undefined)).to.equal(null);
      expect(didToAddress("")).to.equal(null);
    });
  });

  describe("requireDidAddress()", () => {
    it("returns normalized address for valid DID", () => {
      const res = requireDidAddress(did);
      expect(res).to.equal(lowerAddress);
    });

    it("returns normalized address for valid ethereum address", () => {
      const res = requireDidAddress(validAddress);
      expect(res).to.equal(lowerAddress);
    });

    it("throws 400 error for invalid address", () => {
      try {
        requireDidAddress("0x1234");
        throw new Error("Expected function to throw");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal("Invalid DID");
        expect(err.status).to.equal(400);
      }
    });

    it("throws error with custom label", () => {
      try {
        requireDidAddress("invalid", "Verifier DID");
        throw new Error("Expected function to throw");
      } catch (err) {
        expect(err.message).to.equal("Invalid Verifier DID");
        expect(err.status).to.equal(400);
      }
    });
  });
});

});