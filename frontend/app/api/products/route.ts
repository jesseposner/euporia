import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";

  try {
    const result = await searchProducts(query);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to search products" },
      { status: 500 },
    );
  }
}
