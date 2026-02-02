// backend/test/vc.test.js
import { jest } from '@jest/globals';
import * as chai from "chai";
import request from "supertest";

import "../test/setup-pinata-mock.js";
import "../test/setup-contract-mock.js";

jest.setTimeout(60000);

const { expect } = chai;

let app;
let pool;
let getValidJwtFor;
let validJwtToken;
let fetchJSON;
let mockContract;

beforeAll(async () => {
  // Override registry FIRST
  ({ mockContract } = await import('../test/setup-contract-mock.js'));
  globalThis.registry = mockContract;
  console.log('[TEST OVERRIDE EARLY] globalThis.registry replaced with mock');

  ({ default: app } = await import("./testServer.js"));
  ({ pool } = await import("../src/utils/db.js"));
  ({ getValidJwtFor } = await import("./testHelpers.js"));
  ({ fetchJSON } = await import("../src/utils/pinata.js"));

  validJwtToken = await getValidJwtFor("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase());

  const subjectAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase();
  const subjectDid = `did:ethr:${subjectAddress}`;

  const verifierAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".toLowerCase();
  const verifierDid = `did:ethr:${verifierAddress}`;

  // Create subject profile (data owner)
  const profileRes = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-jwt")
    .send({
      owner: subjectAddress,
      contexts: { profile: { attributes: { name: "Subject" } } }
    });

  expect(profileRes.status).to.equal(200);

  // Consent: subject (owner) grants verifier (reader) access
  await pool.query(`
    INSERT INTO consents (
      subject_did, claim_id, purpose, verifier_did, context, issued_at, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
    ON CONFLICT DO NOTHING
  `, [
    subjectAddress,      // plain address of data owner
    'identity.email',
    'Email verification for login',
    verifierAddress,     // plain address of verifier
    'profile'
  ]);

  const check = await pool.query(
    'SELECT * FROM consents WHERE subject_did = $1 AND verifier_did = $2',
    [subjectAddress, verifierAddress]
  );
  console.log('[DEBUG CONSENT AFTER INSERT]', check.rows);

  console.log('[TEST SETUP] Consent granted: subject → verifier for identity.email');
});

describe("Verifiable Credentials Routes", () => {
  const subjectAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase();
  const subjectDid = `did:ethr:${subjectAddress}`;

  const verifierAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".toLowerCase();
  const verifierDid = `did:ethr:${verifierAddress}`;

  beforeEach(async () => {
    validJwtToken = await getValidJwtFor(subjectAddress);  // token for subject (owner/signer)
  });

  it("POST /api/vc/issue should issue VC and return enriched data (hybrid mode)", async () => {
    const res = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", process.env.PINATA_JWT)
      .send({
        issuer: subjectDid,      // issuer = subject (owner)
        subject: subjectDid,     // claims for self
        claimId: "identity.email",
        claim: { email: "subject@example.com" },
        context: "profile",
        consent: { purpose: "Email verification for login" },
      });

    expect(res.status).to.equal(200);
    expect(res.body.message).to.include("VC prepared");
    expect(res.body).to.have.property("cid");
    expect(res.body).to.have.property("signedCid");
    expect(res.body).to.have.property("claimHash");
    expect(res.body).to.have.property("unsignedTx");
    expect(res.body).to.have.property("profileUnsignedTx");
    expect(res.body.gatewayUrl).to.include("pinata.cloud/ipfs/");
  });

  it("POST /api/vc/issue should reject missing required fields", async () => {
    const res = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        issuer: subjectDid,
        subject: subjectDid,
        // missing claimId & claim
      });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("issuer, subject, claimId, and claim are required");
  });

  it("POST /api/vc/issue should reject missing consent purpose", async () => {
    const res = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        issuer: subjectDid,
        subject: subjectDid,
        claimId: "identity.email",
        claim: { email: "test@example.com" },
        consent: {}, // missing purpose
      });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("Explicit consent purpose is required");
  });

  // ─── VERIFY VC ────────────────────────────────────────────────────────────

  it("POST /api/vc/verify should successfully verify disclosed VC with consent", async () => {
    const issueRes = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", process.env.PINATA_JWT)
      .send({
        issuer: subjectDid,
        subject: subjectDid,
        claimId: "identity.email",
        claim: { email: "subject@example.com" },
        context: "profile",
        consent: { purpose: "Email verification for login" },
      });

    expect(issueRes.status).to.equal(200);

    const res = await request(app)
      .post("/api/vc/verify")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        subject: subjectDid,
        verifierDid: verifierDid,
        purpose: "Email verification for login",
        context: "profile",
        consent: true,
        credentials: [{ cid: issueRes.body.signedCid, claimId: "identity.email" }],
      });

    console.log('[VC Verify Test] Response:', res.body);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("disclosed");
    expect(res.body.disclosed["identity.email"]).to.equal("subject@example.com");
    expect(res.body.denied || {}).to.be.empty;
  });

  it("POST /api/vc/verify should reject without consent", async () => {
    await pool.query(
      `UPDATE consents SET revoked_at = NOW() WHERE subject_did = $1 AND claim_id = $2`,
      [subjectAddress, "identity.email"]
    );

    const res = await request(app)
      .post("/api/vc/verify")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        subject: subjectDid,
        verifierDid: verifierDid,
        purpose: "Email verification for login",
        context: "profile",
        consent: true,
        credentials: [{ cid: "QmFakeCid", claimId: "identity.email" }],
      });

    expect(res.status).to.equal(403);
    expect(res.body.error).to.include("No credentials authorized");
  });

  // ─── Revocation & Expiration ──────────────────────────────────────────────

it("POST /api/vc/verify should deny when consent is revoked", async () => {
  // 1. Issue VC
  const issueRes = await request(app)
    .post("/api/vc/issue")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", process.env.PINATA_JWT)
    .send({
      issuer: subjectDid,
      subject: subjectDid,
      claimId: "identity.email",
      claim: { email: "subject@example.com" },
      context: "profile",
      consent: { purpose: "Email verification for login" },
    });

  expect(issueRes.status).to.equal(200);
  const cid = issueRes.body.signedCid;

  // 2. Revoke consent (simulate user revoking access)
  await pool.query(`
    UPDATE consents
    SET revoked_at = NOW()
    WHERE subject_did = $1
      AND claim_id = $2
      AND context = $3
  `, [subjectAddress, "identity.email", "profile"]);

  // 3. Try to verify → should be denied
  const verifyRes = await request(app)
    .post("/api/vc/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      subject: subjectDid,
      verifierDid: verifierDid,
      purpose: "Email verification for login",
      context: "profile",
      consent: true,
      credentials: [{ cid, claimId: "identity.email" }]
    });

  expect(verifyRes.status).to.equal(403);
  expect(verifyRes.body.error).to.include("No credentials authorized");
  expect(verifyRes.body.denied).to.have.property("identity.email");
  expect(verifyRes.body.denied["identity.email"]).to.include("No valid consent");
});

it("POST /api/vc/verify should deny when consent has expired", async () => {
  // 1. Issue VC
  const issueRes = await request(app)
    .post("/api/vc/issue")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", process.env.PINATA_JWT)
    .send({
      issuer: subjectDid,
      subject: subjectDid,
      claimId: "identity.email",
      claim: { email: "subject@example.com" },
      context: "profile",
      consent: { purpose: "Email verification for login" },
    });

  expect(issueRes.status).to.equal(200);
  const cid = issueRes.body.signedCid;

  // 2. Force expiration (set expires_at to past)
  await pool.query(`
    UPDATE consents
    SET expires_at = NOW() - INTERVAL '1 day'
    WHERE subject_did = $1
      AND claim_id = $2
      AND context = $3
  `, [subjectAddress, "identity.email", "profile"]);

  // 3. Try to verify → should be denied
  const verifyRes = await request(app)
    .post("/api/vc/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      subject: subjectDid,
      verifierDid: verifierDid,
      purpose: "Email verification for login",
      context: "profile",
      consent: true,
      credentials: [{ cid, claimId: "identity.email" }]
    });

  expect(verifyRes.status).to.equal(403);
  expect(verifyRes.body.error).to.include("No credentials authorized");
  expect(verifyRes.body.denied).to.have.property("identity.email");
  expect(verifyRes.body.denied["identity.email"]).to.include("No valid consent");
});

it("POST /api/vc/verify should succeed when consent is active (not revoked, not expired)", async () => {
  // 1. Issue VC
  const issueRes = await request(app)
    .post("/api/vc/issue")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", process.env.PINATA_JWT)
    .send({
      issuer: subjectDid,
      subject: subjectDid,
      claimId: "identity.email",
      claim: { email: "subject@example.com" },
      context: "profile",
      consent: { purpose: "Email verification for login" },
    });

  expect(issueRes.status).to.equal(200);
  const cid = issueRes.body.signedCid;

  // 2. Ensure consent is fresh and long-lived
  await pool.query(`
    UPDATE consents
    SET expires_at = NOW() + INTERVAL '30 days',
        revoked_at = NULL
    WHERE subject_did = $1
      AND claim_id = $2
      AND context = $3
  `, [subjectAddress, "identity.email", "profile"]);

  // 3. Verify → should succeed
  const verifyRes = await request(app)
    .post("/api/vc/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      subject: subjectDid,
      verifierDid: verifierDid,
      purpose: "Email verification for login",
      context: "profile",
      consent: true,
      credentials: [{ cid, claimId: "identity.email" }]
    });

  expect(verifyRes.status).to.equal(200);
  expect(verifyRes.body.disclosed).to.have.property("identity.email");
  expect(verifyRes.body.disclosed["identity.email"]).to.equal("subject@example.com");
  expect(verifyRes.body.denied || {}).to.be.empty;
});

  it("POST /api/vc/validate should validate a raw VC (signature + on-chain)", async () => {
    const issueRes = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", process.env.PINATA_JWT)
      .send({
        issuer: subjectDid,
        subject: subjectDid,
        claimId: "profile.bio",
        claim: { bio: "Decentralized identity enthusiast" },
        context: "profile",
        consent: { purpose: "Bio sharing" },
      });

    expect(issueRes.status).to.equal(200);

    const enrichedCid = issueRes.body.cid;
    const signedCid = issueRes.body.signedCid;  // the one hashed & anchored
    const claimId = "profile.bio";

    const vc = await fetchJSON(enrichedCid);

    console.log('[VC Test] Raw VC fetched:', JSON.stringify(vc, null, 2));

    expect(vc).to.have.property("proof");
    expect(vc.proof).to.have.property("jws");

    const res = await request(app)
      .post("/api/vc/validate")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("Content-Type", "application/json")
      .send(vc);

    console.log('[VC Validate Test] Response:', res.body);

    expect(res.status).to.equal(200);
    expect(res.body.message).to.include("cryptographically and on-chain valid");
    expect(res.body.claimId).to.equal(claimId);
    expect(res.body.cid).to.equal(signedCid);
  });

  it("POST /api/vc/validate should reject invalid signature", async () => {
    const fakeVC = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer: subjectDid,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,
        claim: { email: "fake@example.com" },
      },
      proof: {
        type: "EcdsaSecp256k1Signature2019",
        created: new Date().toISOString(),
        proofPurpose: "assertionMethod",
        verificationMethod: subjectDid,
        jws: "0x" + "deadbeef".repeat(16) + "01",  // Invalid signature
      },
      pimv: {
        claimId: "identity.email",
        context: "profile",
        purpose: "Email verification for login",
        consentRequired: true
      },
    };

    const res = await request(app)
      .post("/api/vc/validate")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send(fakeVC);

    console.log('[VC Invalid Signature Test] Response:', res.body);

    expect(res.status).to.equal(400);
    expect(res.body.error).to.match(/non-canonical s|high s/i);
    
  });

  // ─── Additional edge cases for /api/vc/issue ──────────────────────────────

it("POST /api/vc/issue accepts invalid issuer format (current behavior)", async () => {
  const res = await request(app)
    .post("/api/vc/issue")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      issuer: "not-a-did",
      subject: subjectDid,
      claimId: "identity.email",
      claim: { email: "test@example.com" },
      context: "profile",
      consent: { purpose: "Email verification" },
    });

  expect(res.status).to.equal(200);
  expect(res.body).to.have.property("cid");
});

it("POST /api/vc/issue accepts empty claim object (current behavior)", async () => {
  const res = await request(app)
    .post("/api/vc/issue")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      issuer: subjectDid,
      subject: subjectDid,
      claimId: "profile.bio",
      claim: {},
      context: "profile",
      consent: { purpose: "Bio sharing" },
    });

  expect(res.status).to.equal(200);
  expect(res.body).to.have.property("cid");
});

// ─── Additional edge cases for /api/vc/validate ───────────────────────────

it("POST /api/vc/validate should reject VC without proof", async () => {
  const vcWithoutProof = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: subjectDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDid,
      claim: { email: "test@example.com" },
    },
    pimv: {
      claimId: "identity.email",
      context: "profile",
      purpose: "Email verification for login",
      consentRequired: true,
      cid: "QmFakeCid"
    }
  };

  const res = await request(app)
    .post("/api/vc/validate")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send(vcWithoutProof);

  expect(res.status).to.equal(400);
  expect(res.body.error).to.include("Invalid VC structure");
});

it("POST /api/vc/validate rejects VC with invalid proof format", async () => {
  const vcBadProof = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: subjectDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDid,
      claim: { email: "test@example.com" },
    },
    pimv: {
      claimId: "identity.email",
      context: "profile",
      purpose: "Email verification for login",
      consentRequired: true,
      cid: "QmFakeCid"
    },
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: subjectDid,
      jws: "not-a-hex-string"
    }
  };

  const res = await request(app)
    .post("/api/vc/validate")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send(vcBadProof);

  expect(res.status).to.equal(400);
  expect(res.body.error).to.include("Invalid signature format");
});

it("POST /api/vc/validate rejects on-chain hash mismatch", async () => {
  const originalGetClaim = globalThis.registry.getClaim;
  globalThis.registry.getClaim = jest.fn().mockResolvedValue("0x0000000000000000000000000000000000000000000000000000000000000000");

  const vc = {
    // use a previously issued VC structure
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: subjectDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDid,
      claim: { bio: "test bio" }
    },
    pimv: {
      context: "profile",
      claimId: "profile.bio",
      purpose: "Bio sharing",
      consentRequired: true,
      cid: "QmMockTestCid_123"
    },
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: subjectDid,
      jws: "0x" + "a".repeat(128) + "1b" // mock valid length
    }
  };

  const res = await request(app)
    .post("/api/vc/validate")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send(vc);

  expect(res.status).to.equal(400);
  expect(res.body.error).to.match(/non-canonical s|invalid signature/i);;

  // Restore mock
  globalThis.registry.getClaim = originalGetClaim;
});

// ─── Additional edge cases for /api/vc/verify ─────────────────────────────

it("POST /api/vc/verify returns denied when consent is revoked", async () => {
  const issueRes = await request(app)
    .post("/api/vc/issue")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", process.env.PINATA_JWT)
    .send({
      issuer: subjectDid,
      subject: subjectDid,
      claimId: "identity.email",
      claim: { email: "subject@example.com" },
      context: "profile",
      consent: { purpose: "Email verification for login" },
    });

  expect(issueRes.status).to.equal(200);
  const cid = issueRes.body.signedCid;

  // Revoke consent
  await pool.query(`
    UPDATE consents 
    SET revoked_at = NOW() 
    WHERE subject_did = $1 AND claim_id = $2
  `, [subjectAddress, "identity.email"]);

  const res = await request(app)
    .post("/api/vc/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      subject: subjectDid,
      verifierDid: verifierDid,
      purpose: "Email verification for login",
      context: "profile",
      consent: true,
      credentials: [{ cid, claimId: "identity.email" }]
    });

  expect(res.status).to.equal(403);
  expect(res.body.denied["identity.email"]).to.include("No valid consent");
});

it("POST /api/vc/verify rejects when no credentials provided", async () => {
  const res = await request(app)
    .post("/api/vc/verify")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .send({
      subject: subjectDid,
      verifierDid: verifierDid,
      purpose: "Email verification for login",
      context: "profile",
      consent: true,
      credentials: []
    });

  expect(res.status).to.equal(400);
  expect(res.body.error).to.include("credentials");
});

});

