import { NextRequest, NextResponse } from "next/server";
import { getProductDetails } from "@/lib/shopify";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;

  try {
    const product = await getProductDetails(handle);
    return NextResponse.json(product);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Product not found" },
      { status: 404 },
    );
  }
}
