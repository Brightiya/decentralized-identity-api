// backend/test/api.test.js
import * as chai from "chai";
import request from "supertest";
import app from "../test/testServer.js";

const { expect } = chai;

describe("Backend API basic tests", function () {
  it("POST /api/did/register should create DID", async () => {
    const res = await request(app)
      .post("/api/did/register")
      .send({ address: "0x0000000000000000000000000000000000000001", name: "Test", email: "test@example.com" });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("did");
    expect(res.body).to.have.property("cid");
  });

  it("GET /api/did/:address should return did object", async () => {
    const address = "0x0000000000000000000000000000000000000001";
    const res = await request(app).get(`/api/did/${address}`);
    expect(res.status).to.be.oneOf([200, 404]);
    if (res.status === 200) expect(res.body).to.have.property("didDocument");
  });

  it("POST /api/profile should reject incomplete body", async () => {
    const res = await request(app).post("/api/profile").send({});
    expect(res.status).to.equal(400);
  });
});