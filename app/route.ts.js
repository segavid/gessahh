export const runtime = "edge";

const TARGET = "https://gesseh.com";

const ROBOTS_TAG =
  "<meta name='robots' content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' />";
const GOOGLE_VERIFY =
  "<meta name='google-site-verification' content='HWrhtgkCPV2OT-OWRzV60Vdl1pWxt35-aEZ7NNDTHWs' />";
const HEADER_BOX = `
<div style="width:100%;background:#ff004c;color:#fff;padding:15px;text-align:center;font-size:20px;font-weight:bold;direction:rtl;">
  <a href="https://z.3isk.news/" style="color:#fff;text-decoration:none;">قصة عشق</a>
</div>
`;

// ---- Helpers ----
function base64Decode(str: string) {
  try {
    const normalized = str.replace(/\s+/g, "").replace(/%3D/g, "=");
    const binary = Buffer.from(
      normalized.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("binary");
    let u8: string[] = [];
    for (let i = 0; i < binary.length; ++i)
      u8.push("%" + ("00" + binary.charCodeAt(i).toString(16)).slice(-2));
    return decodeURIComponent(u8.join(""));
  } catch {
    return null;
  }
}

function buildServerUrl(server: any) {
  const name = (server.name || "").toLowerCase();
  const id = server.id || "";
  if (/^https?:\/\//i.test(id)) return id;
  if (name.includes("estream")) return `https://arabveturk.com/embed-${id}.html`;
  if (name.includes("arab")) return `https://v.turkvearab.com/embed-${id}.html`;
  if (name.includes("ok")) return `https://ok.ru/videoembed/${id}`;
  if (name.includes("red")) return `https://iplayerhls.com/e/${id}`;
  if (name.includes("express")) return id;
  return id;
}

// ---- Main handler ----
export async function GET(req: Request) {
  const url = new URL(req.url);
  const workerDomain = url.origin;
  const upstream = TARGET + url.pathname + url.search;

  const resp = await fetch(upstream, {
    method: "GET",
    headers: {
      "Referer": TARGET,
      "User-Agent": "Mozilla/5.0 (VercelEdge)"
    },
    redirect: "follow",
  });

  const contentType = (resp.headers.get("content-type") || "").toLowerCase();

  // ✅ Handle HTML
  if (contentType.includes("text/html")) {
    let body = await resp.text();

    const targetHost = new URL(TARGET).host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp(`https?:\/\/${targetHost}`, "gi"), workerDomain);
    body = body.replace(new RegExp(`\/\/${targetHost}`, "gi"), workerDomain);
    body = body.replace(/(src|href)=["']\/([^"']+)["']/gi, `$1="${workerDomain}/$2"`);

    // decode base64 links
    body = body.replace(
      /<a\s+([^>]*?)href=(["'])https?:\/\/arbandroid\.com\/[^"']+\?url=([^"']+)\2([^>]*)>/gi,
      (whole, beforeAttr, q, encoded, afterAttr) => {
        try {
          const decoded = base64Decode(decodeURIComponent(encoded));
          if (!decoded) return whole;
          const cleanUrl = decoded.replace(/https?:\/\/(?:www\.)?gesseh\.com/gi, workerDomain);
          return `<a ${beforeAttr}href="${cleanUrl}"${afterAttr}>`;
        } catch {
          return whole;
        }
      }
    );

    // replace embed block with copyable servers
    body = body.replace(
      /<script[^>]*type=["']litespeed\/javascript["'][^>]*>[\s\S]*?<\/script>\s*<div class="secContainer bg">[\s\S]*?<div class="singleInfo"/i,
      (match) => {
        const encMatch = match.match(/post=([^"'\s]+)/i);
        if (!encMatch) return match;
        const decoded = base64Decode(encMatch[1]);
        if (!decoded) return match;

        let data: any;
        try {
          data = JSON.parse(decoded);
        } catch {
          return match;
        }

        const servers = (data.servers || [])
          .map((s: any) => ({ name: s.name, url: buildServerUrl(s) }))
          .filter((s: any) => !!s.url);

        if (!servers.length) return match;

        const serversHtml = servers
          .map((s: any, i: number) => {
            const safeUrl = s.url.replace(/"/g, "&quot;");
            const safeName = s.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `
<div class="srv-row">
  <b>${safeName}</b>
  <input type="text" readonly value="${safeUrl}" class="srv-url" id="u${i}">
  <button onclick="navigator.clipboard.writeText(document.getElementById('u${i}').value);this.textContent='✓'">نسخ</button>
</div>`;
          })
          .join("");

        return `
<style>
.notice-bar{background:#222;color:#fff;padding:10px;text-align:center;font-size:15px}
.getEmbed{max-width:800px;margin:0 auto;padding:10px}
.srv-row{display:flex;align-items:center;gap:6px;margin:5px 0;flex-wrap:wrap}
.srv-row b{min-width:70px;font-size:14px;flex-shrink:0}
.srv-url{width:300px;max-width:100%;padding:5px;font-size:11px;overflow:hidden;text-overflow:ellipsis}
.srv-row button{background:#ff004c;color:#fff;border:0;padding:5px 10px;cursor:pointer;border-radius:3px;font-size:13px;white-space:nowrap}
.srv-row button:hover{background:#222}
@media(max-width:600px){.srv-url{width:200px}}
</style>
<div class="notice-bar">يرجى نسخ السيرفر وفتحه في المتصفح</div>
<div class="getEmbed">${serversHtml}</div>
<div class="singleInfo"`;
      }
    );

    // clean + inject meta
    body = body.replace(/<meta[^>]*name=['"]robots['"][^>]*>/gi, "");
    body = body.replace(/<meta[^>]*name=['"]google-site-verification['"][^>]*>/gi, "");
    body = body.replace(/<link[^>]*rel=['"]canonical['"][^>]*>/gi, "");
    body = body.replace(
      /<head>/i,
      "<head>\n" + ROBOTS_TAG + "\n" + GOOGLE_VERIFY + `\n<link rel="canonical" href="${workerDomain}/video/" />`
    );

    // add banner
    body = HEADER_BOX + "\n" + body;

    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  }

  // ✅ Handle XML, RSS
  if (contentType.includes("xml") || contentType.includes("rss") || contentType.includes("text/plain")) {
    let body = await resp.text();
    const targetHost = new URL(TARGET).host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp(`https?:\/\/${targetHost}`, "gi"), workerDomain);
    body = body.replace(new RegExp(`\/\/${targetHost}`, "gi"), workerDomain);
    return new Response(body, {
      status: 200,
      headers: { "content-type": "application/xml; charset=UTF-8" },
    });
  }

  // fallback
  return new Response(await resp.arrayBuffer(), {
    status: resp.status,
    headers: resp.headers,
  });
}
