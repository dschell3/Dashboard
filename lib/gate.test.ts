import { describe, it, expect } from "vitest";
import { issueToken, verifyToken, safeEqual, SESSION_SECONDS } from "./gate";

const PW = "correct-horse";

describe("auth token", () => {
  it("round-trips: issued token verifies", async () => {
    const t = await issueToken(PW);
    expect(await verifyToken(t, PW)).toBe(true);
  });

  it("rejects the token after its embedded expiry (server-enforced)", async () => {
    const t = await issueToken(PW);
    const afterExpiry = Date.now() + (SESSION_SECONDS + 60) * 1000;
    expect(await verifyToken(t, PW, afterExpiry)).toBe(false);
  });

  it("rejects a token signed with a different password", async () => {
    const t = await issueToken("other-password");
    expect(await verifyToken(t, PW)).toBe(false);
  });

  it("rejects a tampered expiry (signature no longer matches)", async () => {
    const t = await issueToken(PW);
    const [exp, sig] = t.split(".");
    const extended = `${Number(exp) + 86400}.${sig}`;
    expect(await verifyToken(extended, PW)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const t = await issueToken(PW);
    const flipped = t.slice(0, -1) + (t.endsWith("0") ? "1" : "0");
    expect(await verifyToken(flipped, PW)).toBe(false);
  });

  it("rejects legacy static-hash cookies (no expiry segment)", async () => {
    expect(await verifyToken("a".repeat(64), PW)).toBe(false);
  });

  it("rejects empty and garbage tokens", async () => {
    expect(await verifyToken("", PW)).toBe(false);
    expect(await verifyToken(".", PW)).toBe(false);
    expect(await verifyToken("notanumber.abc", PW)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("matches equal strings", () => expect(safeEqual("abc", "abc")).toBe(true));
  it("rejects different strings of equal length", () => expect(safeEqual("abc", "abd")).toBe(false));
  it("rejects different lengths", () => expect(safeEqual("abc", "abcd")).toBe(false));
});
