import request from "supertest";
import { setup, getApp } from "./setup.js";

beforeAll(async () => { await setup(); });

describe("Auth Endpoints", () => {
  test("POST /api/v1/auth/register — creates user + account", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com", password: "Alice@123", user_id: "alice", name: "Alice" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("alice@test.com");
    expect(res.body.user.user_id).toBe("alice");
  });

  test("POST /api/v1/auth/register — rejects weak password", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/register")
      .send({ email: "weak@test.com", password: "short", user_id: "weak", name: "Weak" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Password");
  });

  test("POST /api/v1/auth/register — rejects duplicate email", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com", password: "Alice@123", user_id: "alice2", name: "Alice2" });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already registered");
  });

  test("POST /api/v1/auth/register — rejects duplicate user_id", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/register")
      .send({ email: "unique@test.com", password: "Alice@123", user_id: "alice", name: "Unique" });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already taken");
  });

  test("POST /api/v1/auth/login — returns token for valid credentials", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com", password: "Alice@123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.user_id).toBe("alice");
  });

  test("POST /api/v1/auth/login — rejects wrong password", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com", password: "WrongPass@1" });

    expect(res.status).toBe(401);
  });

  test("POST /api/v1/auth/login — rejects non-existent email", async () => {
    const res = await request(getApp())
      .post("/api/v1/auth/login")
      .send({ email: "nobody@test.com", password: "Alice@123" });

    expect(res.status).toBe(401);
  });

  test("GET /api/v1/auth/me — returns user for valid token", async () => {
    const loginRes = await request(getApp())
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com", password: "Alice@123" });

    const res = await request(getApp())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("alice@test.com");
  });

  test("GET /api/v1/auth/me — rejects missing token", async () => {
    const res = await request(getApp()).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});
