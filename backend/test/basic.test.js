// backend/test/basic.test.js
import { jest } from '@jest/globals';
import * as chai from "chai";
import request from "supertest";
import app from "./testServer.js";
import { pool } from "../src/utils/db.js";
import { getValidJwtFor } from "./testHelpers.js";

//import '../setup-pinata-mock.js';
import '../setup-contract-mock.js';
jest.setTimeout(60000);

const { expect } = chai;

let validJwtToken;
const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
const testDid = `did:ethr:${testAddress}`;

beforeAll(async () => {
  validJwtToken = await getValidJwtFor(testAddress);

  await pool.query(`
    INSERT INTO consents (subject_did, claim_id, purpose, context, issued_at, expires_at)
    VALUES 
      ($1, 'profile.all', 'Full access', 'profile', NOW(), NULL),
      ($1, 'identity.name', 'Display name', 'profile', NOW(), NULL),
      ($1, 'identity.email', 'Contact email', 'profile', NOW(), NULL)
    ON CONFLICT DO NOTHING
  `, [testDid]);

  const profileRes = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
    .send({
      owner: testAddress,
      contexts: { profile: { attributes: { name: "Tony I", email: "tony@example.com" } } }
    });

  if (profileRes.status !== 200) {
    throw new Error("Profile setup failed");
  }
});

describe("Backend API Basic Smoke Tests", function () {
  let validJwtToken;
  const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
  const testDid = `did:ethr:${testAddress}`;

  beforeAll(async () => {
    // Get valid JWT using the helper
    validJwtToken = await getValidJwtFor(testAddress);

    // Grant consent once for protected routes
    await pool.query(
      `
      INSERT INTO consents (subject_did, claim_id, purpose, context, issued_at, expires_at)
      VALUES 
        ($1, 'identity.name',  'Display name',    'profile', NOW(), NULL),
        ($1, 'identity.email', 'Contact email',  'profile', NOW(), NULL),
        ($1, 'profile.bio',    'Short bio',      'profile', NOW(), NULL)
      ON CONFLICT DO NOTHING
      `,
      [testAddress]
    );
  });

  // Basic route tests (no auth required)
  it("POST /profile should reject incomplete body", async () => {
  const res = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`) // keep auth
    .send({}); // missing owner

  expect(res.status).to.equal(400); 
  expect(res.body.error).to.include("owner address required");
});

  // GDPR erase basic tests (no auth required)
  it("DELETE /gdpr/erase should reject without DID", async () => {
    const res = await request(app).delete("/gdpr/erase").send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "DID required");
  });

  it("DELETE /gdpr/erase should return 404 for non-existing profile", async () => {
    const fakeDid = `did:ethr:0x0000000000000000000000000000000000009999`;
    const res = await request(app).delete("/gdpr/erase").send({ did: fakeDid });
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property("error", "Profile not found");
  });

  // Protected routes integration smoke (require auth + consent)
  describe("Protected Routes Integration (Auth + Consent)", function () {
    it("GET /api/profile/:address should return own profile (self-read allowed)", async () => {
  // Step 1: Fetch profile
      const profileRes = await request(app)
        .get(`/api/profile/${testAddress}`)
        .set("Authorization", `Bearer ${validJwtToken}`);

      expect(profileRes.status).to.equal(200);
      expect(profileRes.body).to.be.an("object");
      expect(profileRes.body).to.have.property("profile");          // your current model
      expect(profileRes.body.profile).to.have.property("owner");    // confirm owner field
      expect(profileRes.body.profile.owner.toLowerCase()).to.equal(testAddress);

      // Step 2: Resolve DID separately
      const didRes = await request(app)
        .get(`/api/did/${testAddress}`)
        .set("Authorization", `Bearer ${validJwtToken}`);

      expect(didRes.status).to.equal(200);
      expect(didRes.body).to.have.property("didDocument");
      expect(didRes.body).to.have.property("cid");
    });


    it("GET /profile/:address should return 403 when reading other profile without consent", async () => {
      const otherAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase();
      const res = await request(app)
        .get(`/api/profile/${otherAddress}`)
        .set("Authorization", `Bearer ${validJwtToken}`);

      expect(res.status).to.be.oneOf([403, 404]);
      if (res.status === 403) {
        expect(res.body.error).to.include("consent");
      }
    });

    it("POST /profile should allow updating own profile with consent", async () => {
      const res = await request(app)
        .post("/api/profile")
        .set("Authorization", `Bearer ${validJwtToken}`)
        .send({
          owner: testAddress,
          contexts: { profile: { attributes: { bio: "Test bio" } } }
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("message").that.includes("Profile prepared");
      expect(res.body).to.have.property("cid");
    });

    it("POST /api/profile should reject update without auth", async () => {
      const res = await request(app)
        .post("/api/profile")
        .send({ name: "Test" });

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property("error").that.includes("Authentication required");
    });

    it("GET /consent/active/:owner should return consents when authenticated", async () => {
      const res = await request(app)
        .get(`/consent/active/${testDid}`)
        .set("Authorization", `Bearer ${validJwtToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array");
    });
  });
});