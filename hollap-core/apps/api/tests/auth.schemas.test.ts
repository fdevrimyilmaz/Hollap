import { loginSchema, registerSchema } from "../src/modules/auth/auth.schemas";

describe("auth schemas", () => {
  it("accepts valid register payload", () => {
    const parsed = registerSchema.parse({
      email: "student@hollap.com",
      password: "secret123",
      name: "Hollap Student",
      role: "STUDENT",
    });
    expect(parsed.email).toBe("student@hollap.com");
  });

  it("rejects invalid login payload", () => {
    expect(() =>
      loginSchema.parse({
        email: "not-an-email",
        password: "123",
      }),
    ).toThrow();
  });
});
