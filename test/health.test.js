const request = require("supertest");
const app = require("../src/app");

describe("Health endpoint", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });
});
