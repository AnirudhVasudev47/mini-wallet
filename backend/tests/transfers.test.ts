import request from "supertest";
import { setup, getApp } from "./setup.js";

beforeAll(async () => {
  await setup();
  const app = getApp();
  await request(app).post("/api/v1/auth/register").send({ email: "alice@test.com", password: "Alice@123", user_id: "alice", name: "Alice" });
  await request(app).post("/api/v1/auth/register").send({ email: "bob@test.com", password: "BobBob@1", user_id: "bob", name: "Bob" });
  const loginRes = await request(app).post("/api/v1/auth/login").send({ email: "alice@test.com", password: "Alice@123" });
  await request(app).post("/api/v1/accounts/alice/deposit").set("Authorization", `Bearer ${loginRes.body.token}`).send({ amount: 1000 });
});

describe("Transfer (authenticated)", () => {
  let aliceToken: string;

  beforeAll(async () => {
    const res = await request(getApp()).post("/api/v1/auth/login").send({ email: "alice@test.com", password: "Alice@123" });
    aliceToken = res.body.token;
  });

  test("POST /api/v1/transfers — transfers from authenticated user", async () => {
    const txId = crypto.randomUUID();
    const res = await request(getApp()).post("/api/v1/transfers").set("Authorization", `Bearer ${aliceToken}`).send({ transaction_id: txId, to_user: "bob", amount: 200 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("completed");
    expect(res.body.from_user).toBe("alice");
    expect(res.body.amount).toBe(200);
  });

  test("POST /api/v1/transfers — transfer with notes", async () => {
    const txId = crypto.randomUUID();
    const res = await request(getApp()).post("/api/v1/transfers").set("Authorization", `Bearer ${aliceToken}`).send({ transaction_id: txId, to_user: "bob", amount: 25, notes: "Coffee money" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("completed");

    // Verify notes appear in transaction history
    const txRes = await request(getApp()).get("/api/v1/accounts/alice/transactions").set("Authorization", `Bearer ${aliceToken}`);
    const notedTx = txRes.body.find((t: any) => t.transaction_id === txId);
    expect(notedTx).toBeDefined();
    expect(notedTx.notes).toBe("Coffee money");
  });

  test("POST /api/v1/transfers — idempotent (duplicate)", async () => {
    const txId = crypto.randomUUID();
    await request(getApp()).post("/api/v1/transfers").set("Authorization", `Bearer ${aliceToken}`).send({ transaction_id: txId, to_user: "bob", amount: 50 });
    const res = await request(getApp()).post("/api/v1/transfers").set("Authorization", `Bearer ${aliceToken}`).send({ transaction_id: txId, to_user: "bob", amount: 50 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("duplicate");
  });

  test("POST /api/v1/transfers — rejects insufficient funds", async () => {
    const res = await request(getApp()).post("/api/v1/transfers").set("Authorization", `Bearer ${aliceToken}`).send({ transaction_id: crypto.randomUUID(), to_user: "bob", amount: 99999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Insufficient funds");
  });

  test("POST /api/v1/transfers — rejects self-transfer", async () => {
    const res = await request(getApp()).post("/api/v1/transfers").set("Authorization", `Bearer ${aliceToken}`).send({ transaction_id: crypto.randomUUID(), to_user: "alice", amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("same account");
  });

  test("POST /api/v1/transfers — requires auth", async () => {
    const res = await request(getApp()).post("/api/v1/transfers").send({ transaction_id: crypto.randomUUID(), to_user: "bob", amount: 10 });
    expect(res.status).toBe(401);
  });
});
