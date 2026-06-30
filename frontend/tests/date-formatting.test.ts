/**
 * Date formatting tests — verifies timestamp display logic.
 */
export {};

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
