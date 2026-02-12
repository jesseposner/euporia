import { NextRequest, NextResponse } from "next/server";
import { addToCart, getCart } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cartId");
  const store = req.nextUrl.searchParams.get("store") || undefined;
  if (!cartId) {
    return NextResponse.json({ error: "cartId required" }, { status: 400 });
  }

  try {
    const cart = await getCart(cartId, store);
    return NextResponse.json(cart);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to get cart";
    const normalized = message.toLowerCase();
    const status = normalized.includes("not found") || normalized.includes("invalid")
      ? 404
      : 500;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, cartId, store } = body;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  try {
    const cart = await addToCart(items, cartId, store);
    return NextResponse.json(cart);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update cart" },
      { status: 500 },
    );
  }
}
