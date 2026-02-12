import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3010";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND}/api/wishlist/${encodeURIComponent(sessionId)}`,
    );
    if (!res.ok) return NextResponse.json({ wishlist: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ wishlist: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, ...rest } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND}/api/wishlist/${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rest),
      },
    );
    if (!res.ok) throw new Error("Failed to add to wishlist");
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to add to wishlist" },
      { status: 500 },
    );
  }
}
