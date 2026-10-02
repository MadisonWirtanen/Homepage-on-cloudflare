export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, runtime: "cloudflare-workers", diagnostic: "minimal" });
    }

    if (url.pathname === "/api/status") {
      return Response.json({
        checkedAt: new Date().toISOString(),
        diagnostic: "minimal",
        providers: {},
        sites: {}
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
