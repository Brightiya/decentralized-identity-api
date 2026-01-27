// backend/test/consent.test.js
import * as chai from "chai";
import request from "supertest";
import app from "./testServer.js";
import { pool } from "../src/utils/db.js";
import { getValidJwtFor } from "./testHelpers.js";

const { expect } = chai;

describe("Consent routes + contextMiddleware", function () {
  const testSubjectAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
  const testSubjectDid = `did:ethr:${testSubjectAddress}`;

  let validJwtToken;

  // ─── Setup: Get JWT + Clean consents before each test ──────────────────────
  beforeEach(async function () {
    validJwtToken = await getValidJwtFor(testSubjectAddress);

    // Clean all consents for this subject before each test
    await pool.query("DELETE FROM consents WHERE subject_did = $1", [testSubjectDid]);
  });

  // ─── Context resolution & default ────────────────────────────────────────

  it("POST /consent/grant should default context to 'profile' when none provided", async () => {
    const res = await request(app)
      .post("/consent/grant") 
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "identity.email",
        purpose: "Email login verification",
      });

    expect([200, 409]).to.include(res.status); // accept duplicate as success
    expect(res.body.context || res.body.granted?.context).to.equal("profile");
  });

  it("POST /consent/grant should prefer query.context over body.context", async () => {
    const res = await request(app)
      .post("/consent/grant?context=social-network")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "profile.bio",
        purpose: "Bio sharing",
        context: "should-be-ignored",
      });

    expect([200, 409]).to.include(res.status);
    expect(res.body.context || res.body.granted?.context).to.equal("social-network");
  });

  it("POST /consent/grant should use body.context when query is absent", async () => {
    const res = await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "profile.photo",
        purpose: "Profile picture",
        context: "media",
      });

    expect([200, 409]).to.include(res.status);
    expect(res.body.context || res.body.granted?.context).to.equal("media");
  });

  it("POST /consent/grant should normalize context to lowercase", async () => {
    const res = await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "identity.name",
        purpose: "Name check",
        context: "IDENTITY-VERIFICATION",
      });

    expect([200, 409]).to.include(res.status);
    expect(res.body.context || res.body.granted?.context).to.equal("identity-verification");
  });

  it("POST /consent/grant should strip null bytes from context", async () => {
    const maliciousContext = "profile\0injection";
    const res = await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "test.claim",
        purpose: "Test",
        context: maliciousContext,
      });

    expect([200, 409]).to.include(res.status);
    expect(res.body.context || res.body.granted?.context).to.equal("profileinjection");
  });

  it("POST /consent/grant should remove SQL comment tokens from context", async () => {
    const maliciousContext = "profile -- drop table users";
    const res = await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "test.claim",
        purpose: "Test",
        context: maliciousContext,
      });

    expect([200, 409]).to.include(res.status);
    expect((res.body.context || res.body.granted?.context || "").trim().replace(/\s+/g, ' '))
  .to.equal("profile drop table users");
  });

  it("POST /consent/grant should truncate context longer than 255 chars", async () => {
    const longContext = "a".repeat(300) + "extra";
    const res = await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "long.context.test",
        purpose: "Testing length limit",
        context: longContext,
      });

    expect([200, 409]).to.include(res.status);
    expect((res.body.context || res.body.granted?.context || "").length).to.equal(255);
  });

  // ─── Revoke with context filter ─────────────────────────────────────────

  it("POST /consent/revoke should use provided context (optional)", async () => {
    // Grant first
    await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "profile.bio",
        purpose: "Bio sharing",
        context: "social",
      });

    // Revoke
    const res = await request(app)
      .post("/consent/revoke")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "profile.bio",
        context: "social",
      });

    expect(res.status).to.equal(200);
    expect(res.body.revokedCount).to.be.at.least(1);
  });

  // ─── Active consents listing ────────────────────────────────────────────

  it("GET /consent/active/:owner/:context should return filtered consents", async () => {
    // Grant in different contexts
    await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "identity.email",
        purpose: "Login",
        context: "authentication",
      });

    await request(app)
      .post("/consent/grant")
      .set("Authorization", `Bearer ${validJwtToken}`)
      .send({
        owner: testSubjectDid,
        claimId: "profile.bio",
        purpose: "Display",
        context: "social",
      });

    const res = await request(app)
      .get(`/consent/active/${testSubjectDid}/social`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array").with.lengthOf(1);
    expect(res.body[0].context).to.equal("social");
  });

  it("GET /consent/active/:owner should return all active consents when no context filter", async () => {
    const res = await request(app)
      .get(`/consent/active/${testSubjectDid}`)
      .set("Authorization", `Bearer ${validJwtToken}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array").with.lengthOf.at.least(2);
  });
});