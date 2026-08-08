const worker = {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response("SoulDrifter static asset binding is unavailable.", { status: 500 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return response;

    const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
    if (!acceptsHtml) return response;

    const fallback = new Request(new URL("/index.html", request.url), request);
    return env.ASSETS.fetch(fallback);
  },
};

export default worker;
