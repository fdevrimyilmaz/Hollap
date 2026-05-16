import request from "supertest";
import { createApp } from "../src/app";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
