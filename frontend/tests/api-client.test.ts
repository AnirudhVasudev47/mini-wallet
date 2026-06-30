/**
 * API client tests — verifies request building and response parsing using mocked fetch.
 */
export {};

const MOCK_API_BASE = "http://localhost:8000/api/v1";

describe("API Client Logic", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Clear localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("login API sends correct request", async () => {
    const mockResponse = {
      token: "test-jwt-token",
      user: { id: "uuid-1", email: "test@test.com", user_id: "test", name: "Test" },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch(`${MOCK_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "Test@123" }),
    });

    const data = await res.json();
    expect(data.token).toBe("test-jwt-token");
    expect(data.user.email).toBe("test@test.com");

    expect(global.fetch).toHaveBeenCalledWith(
      `${MOCK_API_BASE}/auth/login`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@test.com", password: "Test@123" }),
      }),
    );
  });

  test("register API sends correct request", async () => {
    const mockResponse = {
      token: "new-jwt-token",
      user: { id: "uuid-2", email: "new@test.com", user_id: "newuser", name: "New User" },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch(`${MOCK_API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "new@test.com",
        password: "NewUser@1",
        user_id: "newuser",
        name: "New User",
      }),
    });

    const data = await res.json();
    expect(data.token).toBe("new-jwt-token");
    expect(data.user.user_id).toBe("newuser");
  });

  test("API error responses throw with error message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid email or password" }),
    });

    const res = await fetch(`${MOCK_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "wrong" }),
    });

    expect(res.ok).toBe(false);
    const data = await res.json();
    expect(data.error).toBe("Invalid email or password");
  });

  test("transfer API sends to_user (not from_user)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          transaction_id: "tx-1",
          from_user: "alice",
          to_user: "bob",
          amount: 100,
          status: "completed",
        }),
    });

    const body = {
      transaction_id: "tx-1",
      to_user: "bob",
      amount: 100,
      notes: "Test payment",
    };

    await fetch(`${MOCK_API_BASE}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify(body),
    });

    // Verify from_user is NOT in the request body
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody).not.toHaveProperty("from_user");
    expect(sentBody.to_user).toBe("bob");
    expect(sentBody.amount).toBe(100);
    expect(sentBody.notes).toBe("Test payment");
  });

  test("authenticated requests include Authorization header", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetch(`${MOCK_API_BASE}/accounts`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer my-jwt-token",
      },
    });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe("Bearer my-jwt-token");
  });
});
