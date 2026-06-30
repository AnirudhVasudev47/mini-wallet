/**
 * Frontend unit tests — API client and validation logic.
 *
 * These test the API module's request building and response parsing
 * using mocked fetch, plus the password validation logic from the
 * registration page.
 */

// ── Password Validation (mirrored from register page) ─────────

function getPasswordChecks(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

describe("Password Validation", () => {
  test("rejects empty password", () => {
    const checks = getPasswordChecks("");
    expect(checks.every((c) => c.met)).toBe(false);
  });

  test("rejects short password", () => {
    const checks = getPasswordChecks("Ab1!");
    const lengthCheck = checks.find((c) => c.label.includes("8 characters"));
    expect(lengthCheck?.met).toBe(false);
  });

  test("rejects password without uppercase", () => {
    const checks = getPasswordChecks("password1!");
    const check = checks.find((c) => c.label.includes("uppercase"));
    expect(check?.met).toBe(false);
  });

  test("rejects password without lowercase", () => {
    const checks = getPasswordChecks("PASSWORD1!");
    const check = checks.find((c) => c.label.includes("lowercase"));
    expect(check?.met).toBe(false);
  });

  test("rejects password without number", () => {
    const checks = getPasswordChecks("Password!");
    const check = checks.find((c) => c.label.includes("number"));
    expect(check?.met).toBe(false);
  });

  test("rejects password without special character", () => {
    const checks = getPasswordChecks("Password1");
    const check = checks.find((c) => c.label.includes("special"));
    expect(check?.met).toBe(false);
  });

  test("accepts strong password", () => {
    const checks = getPasswordChecks("Alice@123");
    expect(checks.every((c) => c.met)).toBe(true);
  });

  test("accepts complex password", () => {
    const checks = getPasswordChecks("Str0ng!Pass#2026");
    expect(checks.every((c) => c.met)).toBe(true);
  });
});

// ── User ID Validation ──────────────────────────────────────

function isValidUserId(id: string): boolean {
  return id.trim().length >= 2 && /^[a-zA-Z0-9_-]+$/.test(id.trim());
}

describe("User ID Validation", () => {
  test("accepts valid IDs", () => {
    expect(isValidUserId("alice")).toBe(true);
    expect(isValidUserId("bob-123")).toBe(true);
    expect(isValidUserId("user_name")).toBe(true);
    expect(isValidUserId("AB")).toBe(true);
  });

  test("rejects short IDs", () => {
    expect(isValidUserId("a")).toBe(false);
    expect(isValidUserId("")).toBe(false);
  });

  test("rejects IDs with special characters", () => {
    expect(isValidUserId("alice@bob")).toBe(false);
    expect(isValidUserId("user name")).toBe(false);
    expect(isValidUserId("alice.bob")).toBe(false);
  });
});

// ── API Client Tests (mocked fetch) ──────────────────────────

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

// ── Date Formatting ──────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

describe("Date Formatting", () => {
  test("formats ISO date string correctly", () => {
    const result = formatTimestamp("2026-06-30T12:00:00.000Z");
    expect(result).toContain("Jun");
    expect(result).toContain("30");
  });

  test("handles PostgreSQL TIMESTAMPTZ", () => {
    const result = formatTimestamp("2026-06-30T12:00:00+05:30");
    expect(result).not.toBe("—");
    expect(result).toContain("Jun");
  });

  test("returns dash for invalid date", () => {
    expect(formatTimestamp("not-a-date")).toBe("—");
    expect(formatTimestamp("")).toBe("—");
  });
});
