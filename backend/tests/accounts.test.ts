import request from "supertest";
import { setup, getApp } from "./setup.js";

beforeAll(async () => {
  await setup();
  const app = getApp();
  await request(app).post("/api/v1/auth/register").send({ email: "alice@test.com", password: "Alice@123", user_id: "alice", name: "Alice" });
  await request(app).post("/api/v1/auth/register").send({ email: "bob@test.com", password: "BobBob@1", user_id: "bob", name: "Bob" });
});

describe("Protected Routes", () => {
  let aliceToken: string;

  beforeAll(async () => {
    const res = await request(getApp()).post("/api/v1/auth/login").send({ email: "alice@test.com", password: "Alice@123" });
    aliceToken = res.body.token;
  });

  test("GET /api/v1/accounts — requires auth", async () => {
    const res = await request(getApp()).get("/api/v1/accounts");
    expect(res.status).toBe(401);
  });

  test("GET /api/v1/accounts — lists accounts with token", async () => {
    const res = await request(getApp()).get("/api/v1/accounts").set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test("GET /api/v1/accounts/:id/balance — only own account", async () => {
    const res = await request(getApp()).get("/api/v1/accounts/alice/balance").set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/v1/accounts/:id/balance — forbidden for other account", async () => {
    const res = await request(getApp()).get("/api/v1/accounts/bob/balance").set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(403);
  });
});
