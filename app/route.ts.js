export const runtime = "edge"; // ✅ required for Edge Functions

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Example target (replace with your logic)
  const target = "https://gesseh.com" + url.pathname + url.search;

  const resp = await fetch(target, {
    headers: { "User-Agent": "VercelEdge/1.0" }
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers
  });
}
