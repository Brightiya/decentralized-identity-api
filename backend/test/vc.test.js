// backend/test/vc.test.js
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
let fetchJSON;

beforeAll(async () => {
  ({ default: app } = await import("./testServer.js"));
  ({ pool } = await import("../src/utils/db.js"));
  ({ getValidJwtFor } = await import("./testHelpers.js"));
  ({ fetchJSON } = await import("../src/utils/pinata.js"));

  // Token for issuer (used in most tests)
  validJwtToken = await getValidJwtFor("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");

  const issuerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();
  const issuerDid = `did:ethr:${issuerAddress}`;

  // Create issuer profile
  const profileRes = await request(app)
    .post("/api/profile")
    .set("Authorization", `Bearer ${validJwtToken}`)
    .set("x-pinata-user-jwt", "dummy-jwt")
    .send({
      owner: issuerAddress,
      contexts: { profile: { attributes: { name: "Issuer" } } }
    });

  expect(profileRes.status).to.equal(200);

  // Grant broad consent for issuer to read subject's profile data (used in verify)
  await pool.query(`
    INSERT INTO consents (
      subject_did, claim_id, purpose, context, verifier_did, issued_at, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
    ON CONFLICT DO NOTHING
  `, [
  //  `did:ethr:0x70997970c51812dc3a010c7d01b50e0d17dc79c8`, // subject
    issuerDid, // claim_id
    'identity.email',
    'Email verification for login',
    'profile',
   // issuerDid // verifier = issuer
   `did:ethr:0x70997970c51812dc3a010c7d01b50e0d17dc79c8`
  ]);

  console.log('[TEST SETUP] Consent granted for issuer to read subject identity.email');
});

describe("Verifiable Credentials Routes", () => {
  const issuerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();
  const subjectAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".toLowerCase();
  const subjectDid = `did:ethr:${subjectAddress}`;

  beforeEach(async () => {
    validJwtToken = await getValidJwtFor(issuerAddress);
  });

  // ─── ISSUE VC ─────────────────────────────────────────────────────────────

  it("POST /api/vc/issue should issue VC and return enriched data (hybrid mode)", async () => {
    const res = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", process.env.PINATA_JWT)
      .send({
        issuer: `did:ethr:${issuerAddress}`,
        subject: subjectDid,
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
        issuer: `did:ethr:${issuerAddress}`,
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
        issuer: `did:ethr:${issuerAddress}`,
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
        issuer: `did:ethr:${issuerAddress}`,
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
        verifierDid: `did:ethr:${issuerAddress}`,
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
    // Revoke any existing consent for this test
    await pool.query(
      `UPDATE consents SET revoked_at = NOW() WHERE subject_did = $1 AND claim_id = $2`,
      [subjectDid, "identity.email"]
    );

    const res = await request(app)
      .post("/api/vc/verify")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        subject: subjectDid,
        verifierDid: `did:ethr:${issuerAddress}`,
        purpose: "Email verification for login",
        context: "profile",
        consent: true,
        credentials: [{ cid: "QmFakeCid", claimId: "identity.email" }],
      });

    expect(res.status).to.equal(403);
    expect(res.body.error).to.include("No credentials authorized");
  });

  // ─── VALIDATE RAW VC ──────────────────────────────────────────────────────

  it("POST /api/vc/validate should validate a raw VC (signature + on-chain)", async () => {
    const issueRes = await request(app)
      .post("/api/vc/issue")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .set("x-pinata-user-jwt", process.env.PINATA_JWT)
      .send({
        issuer: `did:ethr:${issuerAddress}`,
        subject: subjectDid,
        claimId: "profile.bio",
        claim: { bio: "Decentralized identity enthusiast" },
        context: "profile",
        consent: { purpose: "Bio sharing" },
      });

    expect(issueRes.status).to.equal(200);
    const signedCid = issueRes.body.signedCid; // use signedCid!
    const claimId = "profile.bio";

    const vc = await fetchJSON(signedCid);

    console.log('[VC Test] Raw VC fetched:', JSON.stringify(vc, null, 2));

    expect(vc).to.have.property("proof");
    expect(vc.proof).to.have.property("jws");
    expect(vc.proof.jws).to.match(/^0x[a-fA-F0-9]+$/);

    // Clean any added fields
    if (vc.pimv) delete vc.pimv.cid;
    delete vc.cid;

    console.log('[VC Test] Sending clean VC:', JSON.stringify(vc, null, 2));

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
      issuer: `did:ethr:${issuerAddress}`,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,
        claim: { email: "fake@example.com" },
      },
      proof: {
        type: "EcdsaSecp256k1Signature2019",
        jws: "0xinvalid-signature",
      },
      pimv: { claimId: "identity.email" },
    };

    const res = await request(app)
      .post("/api/vc/validate")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send(fakeVC);

    expect(res.status).to.equal(400); // now 400 instead of 500
    expect(res.body.error).to.include("Invalid signature");
  });
});