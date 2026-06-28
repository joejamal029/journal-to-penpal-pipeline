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

  it("DIAGNOSTIC TEST: parse screenshot text", () => {
    const text = `### Thought
Don't put your happiness in the
hands of very unpredictable
external factors (e.g game, people)
it makes the pain worse.

### Idea
I should specifically set out time for
a recharge and utility time. For
clarity, mentally and to clean my
environment (clarity). To prevent

### Idea
What if there's an app that allows
you to exchange diaries with the
other person perfectly random and
anon.
expansion: Like you're gonna
experience someone else's life like
a story.`;
    const result = parseJournal(text, "January 7, Sun.md");
    console.log("DIAGNOSTIC RESULT UNITS:", JSON.stringify(result.units, null, 2));
    expect(result.units.length).toBe(3);

    // Check first unit line range
    expect(result.units[0].source_line_number).toBe(2);
    expect(result.units[0].source_end_line_number).toBe(5);

    // Check third unit line range
    expect(result.units[2].source_line_number).toBe(14);
    expect(result.units[2].source_end_line_number).toBe(20);
  });

  it("should dynamically parse custom section headers as dynamic categories", () => {
    const text = `
### Expansion
This is a custom category thought unit.
`;
    const result = parseJournal(text, "test.md");
    expect(result.units.length).toBe(1);
    expect(result.units[0].category).toBe("expansion");
    expect(result.units[0].section).toBe("Expansion");
  });
});
