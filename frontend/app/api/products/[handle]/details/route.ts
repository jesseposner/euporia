import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/shopify";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const store = req.nextUrl.searchParams.get("store") || undefined;

  try {
    const result = await searchProducts(handle, undefined, undefined, undefined, store);
    const product = result.products.find((p) => p.handle === handle);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(product);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Product not found" },
      { status: 404 },
    );
  }
}
