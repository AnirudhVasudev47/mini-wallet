/**
 * Password validation tests — mirrors the validation logic from the register page.
 */
export {};

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
