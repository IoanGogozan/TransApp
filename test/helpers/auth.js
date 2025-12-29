const request = require("supertest");
const app = require("../../src/app");

const loginWithSlug = async ({ companySlug, identifier, password, expectedStatus = 200 }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier, password });
  expect(res.status).toBe(expectedStatus);
  return res;
};

module.exports = { loginWithSlug };
