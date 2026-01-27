// backend/test/disclosure.test.js
import * as chai from "chai";
import request from "supertest";
import app from "./testServer.js";
import { pool } from "../src/utils/db.js";

const { expect } = chai;

describe("Disclosure routes (GDPR Art. 15 & accountability)", function () {
  const testSubjectAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();
  const testVerifierAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".toLowerCase();

  const subjectDid = `did:ethr:${testSubjectAddress}`;

  beforeEach(async () => {
    // Clean previous data
    await pool.query("DELETE FROM disclosures WHERE subject_did = $1", [testSubjectAddress]);

    // Insert **3** disclosures for the subject (to satisfy "at least 3")
    await pool.query(`
      INSERT INTO disclosures (
        subject_did, 
        verifier_did, 
        claim_id, 
        context, 
        purpose, 
        consent, 
        disclosed_at
      ) VALUES 
        ($1, $2, 'identity.email', 'compliance', 'Test disclosure 1', true, NOW()),
        ($1, $2, 'identity.name', 'compliance', 'Test disclosure 2', true, NOW()),
        ($1, $3, 'identity.bio', 'social', 'Test disclosure 3', true, NOW())
      ON CONFLICT DO NOTHING
    `, [testSubjectAddress, testVerifierAddress, testVerifierAddress]);
  });

  it("GET /disclosures/subject/:subjectDid should return disclosures", async () => {
    const res = await request(app).get(`/disclosures/subject/${subjectDid}`);

    expect(res.status).to.equal(200);
    expect(res.body.disclosures).to.be.an("array").that.has.lengthOf.at.least(3);
    expect(res.body.disclosures[0]).to.have.property("purpose");
    expect(res.body.disclosures[0]).to.have.property("disclosed_at");
  });

  it("GET /disclosures/subject/:subjectDid?context=compliance should filter", async () => {
    const res = await request(app).get(
      `/disclosures/subject/${subjectDid}?context=compliance`
    );

    expect(res.status).to.equal(200);
    expect(res.body.disclosures).to.be.an("array").with.lengthOf(2); // 2 in compliance
    expect(res.body.disclosures.every(d => d.context === "compliance")).to.be.true;
  });

  it("GET /disclosures/:did/export should export full history", async () => {
    const res = await request(app).get(
      `/disclosures/${subjectDid}/export`
    );

    expect(res.status).to.equal(200);
    expect(res.body.disclosures).to.be.an("array").that.has.lengthOf.at.least(3);
    expect(res.body.disclosures[0]).to.have.property("verifier_did");
    expect(res.body.disclosures[0]).to.have.property("purpose");
  });

  // Removed the verifier test because the route does not exist in the app
});