const COOKIE_NAME = "souldrifter_beta";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const SESSION_PURPOSE = "souldrifter-beta-access-v1";
const encoder = new TextEncoder();

function htmlResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      ...headers,
    },
  });
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SoulDrifter Beta Access</title>
  <style>
    :root { color-scheme: dark; font-family: Georgia, "Times New Roman", serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; color: #dce8e5; background: radial-gradient(circle at 50% 18%, #173b39 0, #091718 34%, #030708 76%); }
    main { width: min(440px, 100%); padding: 38px; border: 1px solid #8b673c; background: rgba(8, 15, 16, .94); box-shadow: 0 28px 80px #000c, inset 0 0 0 1px #52cfc333; }
    .sigil { width: 52px; height: 52px; margin: 0 auto 20px; display: grid; place-items: center; transform: rotate(45deg); border: 1px solid #65d9ce; color: #65d9ce; box-shadow: 0 0 28px #45c9bd55; }
    .sigil span { transform: rotate(-45deg); font-size: 24px; }
    .eyebrow { margin: 0 0 8px; color: #c5975a; font: 600 12px/1.3 Arial, sans-serif; letter-spacing: .22em; text-align: center; text-transform: uppercase; }
    h1 { margin: 0; color: #f3ead7; font-size: clamp(29px, 8vw, 42px); font-weight: 400; letter-spacing: .055em; text-align: center; text-transform: uppercase; }
    .intro { margin: 16px auto 26px; max-width: 34ch; color: #9db0ac; line-height: 1.55; text-align: center; }
    label { display: block; margin-bottom: 9px; color: #cfb47e; font: 600 12px/1.3 Arial, sans-serif; letter-spacing: .13em; text-transform: uppercase; }
    input { width: 100%; height: 52px; padding: 0 17px; border: 1px solid #48645f; border-radius: 5px; outline: none; color: #f3ead7; background: #071011; font-size: 18px; }
    input:focus { border-color: #65d9ce; box-shadow: 0 0 0 3px #65d9ce22; }
    button { width: 100%; height: 48px; margin-top: 14px; border: 1px solid #b98b51; border-radius: 4px; color: #f7ecd8; background: linear-gradient(#704823, #452a17); font: 700 13px/1 Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; }
    button:hover { filter: brightness(1.16); }
    .error { margin: 14px 0 0; color: #ff9b82; text-align: center; }
    .note { margin: 22px 0 0; color: #718681; font: 12px/1.5 Arial, sans-serif; text-align: center; }
  </style>
</head>
<body>
  <main>
    <div class="sigil" aria-hidden="true"><span>◇</span></div>
    <p class="eyebrow">The First Breach</p>
    <h1>SoulDrifter</h1>
    <p class="intro">This preview is sealed for invited beta testers. Enter the shared breach password to continue.</p>
    <form method="post" action="/beta-login">
      <label for="password">Beta password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Enter the Soulwell</button>
    </form>
    ${error ? `<p class="error" role="alert">${error}</p>` : ""}
    <p class="note">Access remains active on this device for fourteen days.</p>
  </main>
</body>
</html>`;
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index % Math.max(1, a.length)] ?? 0) ^ (b[index % Math.max(1, b.length)] ?? 0);
  }
  return difference === 0;
}

async function sessionToken(secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_PURPOSE));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return "";
}

async function isAuthorized(request, env) {
  if (!env.SESSION_SECRET) return false;
  return constantTimeEqual(cookieValue(request), await sessionToken(env.SESSION_SECRET));
}

async function handleLogin(request, env) {
  if (!env.BETA_PASSWORD || !env.SESSION_SECRET) {
    return htmlResponse(loginPage("Beta access is not configured yet."), 503);
  }
  const form = await request.formData();
  const supplied = String(form.get("password") ?? "");
  if (!constantTimeEqual(supplied, env.BETA_PASSWORD)) {
    return htmlResponse(loginPage("That password did not open the breach."), 401);
  }
  const token = await sessionToken(env.SESSION_SECRET);
  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
      "cache-control": "no-store",
      "set-cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    },
  });
}

function protectedAssetResponse(response) {
  const headers = new Headers(response.headers);
  // The host's static layer otherwise marks HTML as publicly cacheable, which
  // could leak a response fetched by an authorized tester to anonymous users.
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("vary", "Cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/beta-login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/beta-logout") {
      return new Response(null, {
        status: 303,
        headers: {
          location: "/beta-login",
          "set-cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    const authorized = await isAuthorized(request, env);
    if (!authorized) return htmlResponse(loginPage());
    if (url.pathname === "/beta-login") return Response.redirect(new URL("/", request.url), 303);

    if (!env.ASSETS) {
      return new Response("SoulDrifter static asset binding is unavailable.", { status: 500 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return protectedAssetResponse(response);

    const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
    if (!acceptsHtml) return protectedAssetResponse(response);

    const fallback = new Request(new URL("/index.html", request.url), request);
    return protectedAssetResponse(await env.ASSETS.fetch(fallback));
  },
};

export default worker;
