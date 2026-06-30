/**
 * User ID validation tests.
 */
export {};

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
