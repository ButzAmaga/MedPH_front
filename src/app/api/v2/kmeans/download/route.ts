import { NextRequest } from "next/server";

const FASTAPI_URL = process.env.NEXT_PUBLIC_BACKEND ?? "http://localhost:8000";

export async function GET(_req: NextRequest) {
  let upstream: Response;

  try {
    upstream = await fetch(`${FASTAPI_URL}/kmeans/v2/download/3d-plot`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    return new Response(JSON.stringify({ detail: "Could not reach the file server." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => upstream.statusText);
    return new Response(JSON.stringify({ detail: text }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Forward the file stream straight to the browser with the correct headers
  // so it triggers a download instead of rendering as plain text.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "image/png", // Fixed: Must be a valid MIME type
      "Content-Disposition": 'attachment; filename="3D plot.png"',
      "Cache-Control": "no-store",
    },
  });
}