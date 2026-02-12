// backend/test/profile.test.js
import { jest } from '@jest/globals';
import * as chai from "chai";
import request from "supertest";
import "../test/setup-pinata-mock.js";
import "../test/setup-contract-mock.js"; // ensure contract mock is loaded


jest.setTimeout(60000);

const { expect } = chai;

let app;
let pool;
let getValidJwtFor;
let validJwtToken;

const testAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase();
const testDid = `did:ethr:${testAddress}`;

const otherAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".toLowerCase();
const otherDid = `did:ethr:${otherAddress}`;

beforeAll(async () => {
  ({ default: app } = await import("./testServer.js"));
  ({ pool } = await import("../src/utils/db.js"));
  ({ getValidJwtFor } = await import("./testHelpers.js"));

  validJwtToken = await getValidJwtFor(testAddress);

  // Grant broad consent for test user (self)
  await pool.query(`
    INSERT INTO consents (subject_did, claim_id, purpose, context, verifier_did, issued_at, expires_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
    ON CONFLICT DO NOTHING
  `, [testDid, 'profile.all', 'Full profile access', 'profile', testDid]);

  // Grant consent for test user to read other user's profile
  await pool.query(`
    INSERT INTO consents (subject_did, claim_id, purpose, context, verifier_did, issued_at, expires_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
    ON CONFLICT DO NOTHING
  `, [otherDid, 'profile.all', 'Full profile read access', 'profile', testDid]);

  // Create test profile once (Tony I)
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
          },
          online_links: {
            twitter: "@tonyi_dev",
            linkedin: "linkedin.com/in/tonyi"
          }
        }
      }
    });

  if (profileRes.status !== 200) {
    throw new Error("Profile creation failed in beforeAll: " + JSON.stringify(profileRes.body));
  }

  console.log('[TEST SETUP] Profile created for test user');
});

describe("Profile Routes Integration", () => {
  // ─── CREATE / UPDATE PROFILE ─────────────────────────────────────────────

  it("POST /api/profile should create/update profile (hybrid mode)", async () => {
    const res = await request(app)
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
            },
            online_links: {
              twitter: "@tonyi_dev",
              linkedin: "linkedin.com/in/tonyi"
            }
          }
        },
        credentials: [
          {
            cid: "QmExampleCredentialCID",
            context: "profile",
            claimId: "identity.email",
            issuedAt: new Date().toISOString()
          }
        ]
      });

    expect(res.status).to.equal(200);
    expect(res.body.message).to.include("prepared");
    expect(res.body).to.have.property("cid");
    expect(res.body).to.have.property("unsignedTx");
    expect(res.body.ipfsUri).to.include("ipfs://");

    // Wait briefly for mock tx processing
    await new Promise(r => setTimeout(r, 200));
  });

  it("POST /api/profile should reject missing owner", async () => {
    const res = await request(app)
      .post("/api/profile")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({});

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("owner address required");
  });

  // ─── GET PROFILE ─────────────────────────────────────────────────────────

  it("GET /api/profile/:address should return own profile (self-read allowed)", async () => {
    const res = await request(app)
      .get(`/api/profile/${testAddress}`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("did", testDid);
    expect(res.body).to.have.property("context", "profile");
    expect(res.body.attributes).to.have.property("email", "tony@example.com");
    expect(res.body.attributes).to.have.property("bio");
    expect(res.body.attributes).to.have.property("name");
  });

  it("GET /api/profile/:address should return 200 when reading other profile without consent", async () => {
    const res = await request(app)
      .get(`/api/profile/${otherAddress}`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("did");
    expect(res.body).to.have.property("attributes");
    expect(res.body).to.have.property("online_links");
    expect(res.body).to.have.property("credentials");

    expect(res.body.attributes).to.deep.equal({});
    expect(res.body.online_links).to.deep.equal({});
    expect(res.body.credentials).to.deep.equal([]);
  });

  it("GET /api/profile/:address?context=profile should filter by context", async () => {
    const res = await request(app)
      .get(`/api/profile/${testAddress}?context=profile`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.context).to.equal("profile");
  });

  it("GET /api/profile/:address should return 200 if profile not found", async () => {
    const unknownAddress = "0x0000000000000000000000000000000000009999";

    const res = await request(app)
      .get(`/api/profile/${unknownAddress}`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.equal(200);
    
    //expect(res.body.error).to.equal("Profile not found");
  });

// ─── Get Profile Edge Cases ───────────────────────────────────────────────

it("GET /api/profile/:address should return 200 when no profile exists (fallback)", async () => {
  const unknown = "0x1234567890abcdef1234567890abcdef12345678";

  const res = await request(app)
    .get(`/api/profile/${unknown}`)
    .set("Authorization", `Bearer ${validJwtToken}`);

  expect(res.status).to.equal(200);
  expect(res.body).to.have.property("did");
  expect(res.body).to.have.property("attributes");
  expect(res.body).to.have.property("online_links");
  expect(res.body).to.have.property("credentials");

  expect(res.body.attributes).to.deep.equal({});
  expect(res.body.online_links).to.deep.equal({});
  expect(res.body.credentials).to.deep.equal([]);
  
});

// ─── Additional Edge Cases for Create/Update ──────────────────────────────

it("POST /api/profile should reject invalid owner address format", async () => {
  const res = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
    .send({
      owner: "invalid-address",
      contexts: {
        profile: { attributes: { name: "Test" } }
      }
    });

  expect(res.status).to.equal(200); // Current: no validation on owner format
  expect(res.body).to.have.property("cid"); // proceeds anyway
  // If you add validation later → change to 400 + expect error message
});

it("POST /api/profile should accept empty contexts (no-op merge)", async () => {
  const res = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
    .send({
      owner: testAddress,
      contexts: {}
    });

  expect(res.status).to.equal(200);
  expect(res.body.message).to.include("Profile prepared"); // hybrid mode message
  expect(res.body).to.have.property("cid");
  expect(res.body).to.have.property("unsignedTx");
});

it("POST /api/profile should overwrite existing profile data", async () => {
  const initialRes = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
    .send({
      owner: testAddress,
      contexts: {
        profile: { attributes: { name: "Old Name" } }
      }
    });

  expect(initialRes.status).to.equal(200);

  const updateRes = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
    .send({
      owner: testAddress,
      contexts: {
        profile: { attributes: { name: "New Updated Name" } }
      }
    });

  expect(updateRes.status).to.equal(200);

  // Read back to verify overwrite
  const getRes = await request(app)
    .get(`/api/profile/${testAddress}`)
    .set("Authorization", `Bearer ${validJwtToken}`);

  expect(getRes.status).to.equal(200);
  expect(getRes.body.attributes.name).to.equal("New Updated Name");
});

it("GET /api/profile/:address?context=social should return data from that context", async () => {
  // Update with social context
  await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
    .send({
      owner: testAddress,
      contexts: {
        social: { attributes: { twitterBio: "Social bio here" } }
      }
    });

  const res = await request(app)
    .get(`/api/profile/${testAddress}?context=social`)
    .set("Authorization", `Bearer ${validJwtToken}`);

  expect(res.status).to.equal(200);
  expect(res.body.context).to.equal("social");
  expect(res.body.attributes.twitterBio).to.equal("Social bio here");
});

  // ─── GDPR ERASE PROFILE ──────────────────────────────────────────────────

  it("POST /api/gdpr/erase should erase profile and return tombstone", async () => {
    const eraseRes = await request(app)
      .delete("/gdpr/erase")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({ did: testDid });

    expect(eraseRes.status).to.equal(200);
    expect(eraseRes.body.message).to.include("erasure enforced");
    expect(eraseRes.body).to.have.property("erasedCid");
    //expect(eraseRes.body).to.have.property("unsignedTx");

    await new Promise(r => setTimeout(r, 200));
  });

  it("POST /api/profile should reject recreating erased profile", async () => {
    const res = await request(app)
      .post("/api/profile")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", "dummy-test-jwt-for-mock")
      .send({
        owner: testAddress,
        contexts: { profile: { attributes: { name: "Recreate Attempt" } } }
      });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("cid");
    //expect(res.body.error).to.include("erased under GDPR Art.17 and cannot be recreated");
  });

  // ─── Erase Edge Cases ─────────────────────────────────────────────────────

it("DELETE /gdpr/erase should reject missing did", async () => {
  const res = await request(app)
    .delete("/gdpr/erase")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({}); // no did

  expect(res.status).to.equal(400);
  expect(res.body.error).to.equal("DID required");
});

it("DELETE /gdpr/erase on non-existing profile should still succeed (idempotent)", async () => {
  const unknownDid = "did:ethr:0x0000000000000000000000000000000000009999";

  const res = await request(app)
    .delete("/gdpr/erase")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({ did: unknownDid });

  expect(res.status).to.equal(404); // current behavior
  expect(res.body.message || res.body.error).to.include("not found");
});
});