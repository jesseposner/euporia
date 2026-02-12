import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3010";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND}/api/wishlist/${encodeURIComponent(sessionId)}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Failed to remove from wishlist");
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to remove from wishlist" },
      { status: 500 },
    );
  }
}
