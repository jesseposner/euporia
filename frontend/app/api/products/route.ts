import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const store = req.nextUrl.searchParams.get("store") || undefined;

  try {
    const result = await searchProducts(query, undefined, undefined, undefined, store);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to search products" },
      { status: 500 },
    );
  }
}
