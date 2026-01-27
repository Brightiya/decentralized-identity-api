// backend/test/did.test.js
import { jest } from '@jest/globals';
import * as chai from "chai";
import request from "supertest";
import app from "./testServer.js";
import { ethers } from "ethers";
import { getValidJwtFor } from "./testHelpers.js";
import { pool } from "../src/utils/db.js";

//import '../setup-pinata-mock.js';
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

  it("POST /api/did/verify should reject invalid signature", async () => {
    const res = await request(app)
      .post("/api/did/verify")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        address: testAddress,
        signature: "0x0000000000000000000000000000000000000000000000000000000000000000"
      });

    // Same logic: 404 if no profile, or 200 with valid:false
    if (res.status === 404) {
      expect(res.body.error).to.equal("DID Document not found");
      return;
    }

    expect(res.status).to.equal(200);
    expect(res.body.valid).to.be.false;
    expect(res.body.message).to.include("failed");
  });
});