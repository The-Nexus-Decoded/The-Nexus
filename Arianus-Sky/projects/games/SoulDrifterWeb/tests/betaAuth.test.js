import { describe, expect, it } from "vitest";
import worker from "../worker/static-sites-worker.js";

const env = {
  BETA_PASSWORD: "test-breach-password",
  SESSION_SECRET: "test-session-secret-that-is-not-deployed",
  ASSETS: {
    fetch: async () => new Response("game asset", { status: 200 }),
  },
};

describe("beta password worker", () => {
  it("shows the password gate without a session cookie", async () => {
    const response = await worker.fetch(new Request("https://example.com/"), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Beta password");
  });

  it("rejects an incorrect password", async () => {
    const request = new Request("https://example.com/beta-login", {
      method: "POST",
      body: new URLSearchParams({ password: "wrong" }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
    expect(await response.text()).toContain("did not open the breach");
  });

  it("issues a secure cookie and serves assets after login", async () => {
    const login = await worker.fetch(new Request("https://example.com/beta-login", {
      method: "POST",
      body: new URLSearchParams({ password: env.BETA_PASSWORD }),
    }), env);
    expect(login.status).toBe(303);
    const cookie = login.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");

    const response = await worker.fetch(new Request("https://example.com/", {
      headers: { cookie: cookie.split(";")[0] },
    }), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("game asset");
  });
});
