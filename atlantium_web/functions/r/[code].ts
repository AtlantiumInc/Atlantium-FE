// atlantium.ai/r/<code> — the affiliate-facing referral link.
// Pages Function (runs before the SPA): server-side proxies the click through
// the api worker (which signs and records the link_clicks event on Boomin),
// then sends the visitor straight to the landing page. One hop from the
// visitor's point of view; the api domain never appears in the address bar.

type PagesContext = {
  params: { code?: string | string[] };
  request: Request;
};

const FALLBACK = "https://atlantium.ai/";

export const onRequestGet = async ({ params, request }: PagesContext): Promise<Response> => {
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = (raw || "").trim();
  if (!code) return Response.redirect(FALLBACK, 302);

  const incoming = new URL(request.url);
  const upstream = new URL(`https://api.atlantium.ai/v1/r/${encodeURIComponent(code)}`);
  incoming.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

  try {
    const response = await fetch(upstream.toString(), {
      redirect: "manual",
      headers: {
        referer: request.headers.get("referer") ?? "",
        "user-agent": request.headers.get("user-agent") ?? "",
      },
    });
    const location = response.headers.get("location");
    if (location) return Response.redirect(location, 302);
  } catch {
    // Recording must never strand the visitor.
  }
  const fallback = new URL(FALLBACK);
  fallback.searchParams.set("ref", code);
  return Response.redirect(fallback.toString(), 302);
};
