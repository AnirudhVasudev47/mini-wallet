import request from "supertest";
import { setup, getApp } from "./setup.js";

beforeAll(async () => {
  await setup();
  const app = getApp();
  await request(app).post("/api/v1/auth/register").send({ email: "alice@test.com", password: "Alice@123", user_id: "alice", name: "Alice" });
  const loginRes = await request(app).post("/api/v1/auth/login").send({ email: "alice@test.com", password: "Alice@123" });
  await request(app).post("/api/v1/accounts/alice/deposit").set("Authorization", `Bearer ${loginRes.body.token}`).send({ amount: 100 });
});

describe("Transaction History (authenticated)", () => {
  let aliceToken: string;

  beforeAll(async () => {
    const res = await request(getApp()).post("/api/v1/auth/login").send({ email: "alice@test.com", password: "Alice@123" });
    aliceToken = res.body.token;
  });

  test("GET /api/v1/accounts/:id/transactions — returns history", async () => {
    const res = await request(getApp()).get("/api/v1/accounts/alice/transactions").set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(["credit", "debit"]).toContain(res.body[0].type);
    // Verify transaction_id is present
    expect(res.body[0].transaction_id).toBeDefined();
  });

  test("GET /api/v1/accounts/:id/transactions — forbidden for other account", async () => {
    const res = await request(getApp()).get("/api/v1/accounts/bob/transactions").set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(403);
  });
});
