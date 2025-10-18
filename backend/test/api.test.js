const chai = require("chai");
const expect = chai.expect;
const request = require("supertest");
const app = require("../testServer"); // small helper that boots app for tests

describe("Backend API basic tests", function () {
  it("GET /api/did/:address should return did object", async () => {
    const address = "0x0000000000000000000000000000000000000001";
    const res = await request(app).get(`/api/did/${address}`);
    expect(res.status).to.be.oneOf([200, 400]); // depending on config
    expect(res.body).to.have.property("did");
  });

  it("POST /api/profile should reject incomplete body", async () => {
    const res = await request(app).post("/api/profile").send({});
    expect(res.status).to.equal(400);
  });
});
