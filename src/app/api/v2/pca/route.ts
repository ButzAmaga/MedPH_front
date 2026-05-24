import { NextRequest } from "next/server";
 
const FASTAPI_URL = process.env.NEXT_PUBLIC_BACKEND ?? "http://localhost:8000";
 
export async function POST(req: NextRequest) {
  // Forward the multipart/form-data body as-is to FastAPI
  const formData = await req.formData();
 
  const upstream = await fetch(`${FASTAPI_URL}/pca/v2/compute_pca`, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
  });
 
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => upstream.statusText);
    return new Response(JSON.stringify({ detail: text }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }
 
  // Pipe the FastAPI SSE stream straight to the browser
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}