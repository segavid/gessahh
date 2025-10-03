import type { NextRequest } from "next/server";

export const config = {
  runtime: "edge"
};

export default async function handler(req: NextRequest) {
  const target = "https://gesseh.com";
  const url = new URL(req.url);
  const upstream = target + url.pathname + url.search;

  const resp = await fetch(upstream, {
    method: req.method,
    headers: req.headers
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers
  });
}
