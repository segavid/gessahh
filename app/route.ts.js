export const runtime = "edge";

export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>موقع قصة عشق</title>
    </head>
    <body style="font-family: Tahoma, Arial; text-align:center; margin-top:50px;">
      <h1><a href="https://z.3isk.news" target="_blank">موقع قصة عشق</a></h1>
    </body>
  </html>
  `;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
    },
  });
}
