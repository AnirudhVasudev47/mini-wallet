import request from "supertest";
import { setup, getApp } from "./setup.js";

beforeAll(async () => {
  await setup();
  await request(getApp()).post("/api/v1/auth/register").send({ email: "alice@test.com", password: "Alice@123", user_id: "alice", name: "Alice" });
});

describe("Deposit (authenticated)", () => {
  let aliceToken: string;

  beforeAll(async () => {
    const res = await request(getApp()).post("/api/v1/auth/login").send({ email: "alice@test.com", password: "Alice@123" });
    aliceToken = res.body.token;
  });

  test("POST /api/v1/accounts/:id/deposit — deposits into own account", async () => {
    const res = await request(getApp()).post("/api/v1/accounts/alice/deposit").set("Authorization", `Bearer ${aliceToken}`).send({ amount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(500);
  });

  test("POST /api/v1/accounts/:id/deposit — forbidden for other account", async () => {
    const res = await request(getApp()).post("/api/v1/accounts/bob/deposit").set("Authorization", `Bearer ${aliceToken}`).send({ amount: 100 });
    expect(res.status).toBe(403);
  });
});
