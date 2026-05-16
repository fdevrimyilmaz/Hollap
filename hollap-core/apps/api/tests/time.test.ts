import { durationToMs } from "../src/lib/time";

describe("durationToMs", () => {
  it("parses minutes", () => {
    expect(durationToMs("15m")).toBe(15 * 60 * 1000);
  });

  it("throws on invalid value", () => {
    expect(() => durationToMs("abc")).toThrow("Invalid duration format");
  });
});
