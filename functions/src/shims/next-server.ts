/**
 * The slice of `next/server` the route handlers actually use.
 *
 * NextResponse.json() is just a Response with a JSON body and content-type, so
 * the handlers keep working untouched outside Next.
 */
export const NextResponse = {
  json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  },
  redirect(url: string | URL, status = 307) {
    return new Response(null, { status, headers: { location: String(url) } });
  },
};
