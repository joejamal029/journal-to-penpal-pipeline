import { describe, it, expect } from "vitest";
import { parseJournal } from "./parser";

describe("Parser File Name Date Extraction Test", () => {
  it("should default to null (undated) if the file name has no date", () => {
    const text = "This is a single thought unit.";
    const result = parseJournal(text, "journal.txt");
    expect(result.units.length).toBe(1);
    expect(result.units[0].date).toBeNull();
    expect(result.units[0].content).toBe("This is a single thought unit.");
  });

  it("should extract ISO date from file name and assign it to thoughts", () => {
    const text = "First thought unit.\n\nSecond thought unit.";
    const result = parseJournal(text, "/path/to/2026-05-31.md");
    expect(result.units.length).toBe(2);
    expect(result.units[0].date).toBe("2026-05-31");
    expect(result.units[0].content).toBe("First thought unit.");
    expect(result.units[1].date).toBe("2026-05-31");
    expect(result.units[1].content).toBe("Second thought unit.");
  });

  it("should extract Long format date from file name and assign it to thoughts", () => {
    const text = "A reflective thought.\n\nAn idea for writing.";
    const result = parseJournal(text, "C:\\Users\\Desktop\\May 12, 2026.markdown");
    expect(result.units.length).toBe(2);
    expect(result.units[0].date).toBe("2026-05-12");
    expect(result.units[0].content).toBe("A reflective thought.");
    expect(result.units[1].date).toBe("2026-05-12");
  });

  it("should override the file name date default when internal date headers exist", () => {
    const text = `
First thought under file name date.

# 2026-06-01
Second thought under new day.
`;
    const result = parseJournal(text, "2026-05-30.md");
    expect(result.units.length).toBe(2);

    // First thought inherits file name date
    expect(result.units[0].date).toBe("2026-05-30");
    expect(result.units[0].content).toBe("First thought under file name date.");

    // Second thought inherits internal day header
    expect(result.units[1].date).toBe("2026-06-01");
    expect(result.units[1].content).toBe("Second thought under new day.");
  });
});
