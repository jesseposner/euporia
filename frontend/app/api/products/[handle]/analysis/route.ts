import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getModel } from "@/lib/llm";
import type { Product } from "@/lib/shopify";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3010";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const store = req.nextUrl.searchParams.get("store") || "";

  // Check backend cache first
  try {
    const cacheRes = await fetch(
      `${BACKEND}/api/insights/${encodeURIComponent(handle)}?store=${encodeURIComponent(store)}`,
    );
    if (cacheRes.ok) {
      const cached = await cacheRes.json();
      return NextResponse.json(cached);
    }
  } catch {
    // Cache miss, proceed to generate
  }

  return NextResponse.json({ error: "No cached analysis" }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const store = req.nextUrl.searchParams.get("store") || undefined;

  // Check cache first
  try {
    const cacheRes = await fetch(
      `${BACKEND}/api/insights/${encodeURIComponent(handle)}?store=${encodeURIComponent(store || "")}`,
    );
    if (cacheRes.ok) {
      return NextResponse.json(await cacheRes.json());
    }
  } catch {
    // Continue to generate
  }

  // Resolve product details using the same cross-store logic as product details API.
  let product: Product | null = null;
  try {
    const detailsRes = await fetch(
      `${req.nextUrl.origin}/api/products/${encodeURIComponent(handle)}/details?store=${encodeURIComponent(store || "")}`,
    );
    if (detailsRes.ok) {
      product = (await detailsRes.json()) as Product;
    }
  } catch {
    // Continue to product-not-found response below.
  }

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 },
    );
  }

  // Generate AI analysis
  try {
    const { text } = await generateText({
      model: getModel(),
      prompt: `Analyze this product and return a JSON object (no markdown, just valid JSON) with this structure:
{
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2"],
  "whoIsThisFor": "A paragraph describing who would benefit most from this product.",
  "features": [
    {"name": "Feature Name", "score": 8.5},
    {"name": "Another Feature", "score": 7.2}
  ]
}

Product: ${product.title}
Description: ${product.description || "No description available"}
Price: ${product.priceRange?.minVariantPrice?.amount || "Unknown"}
Type: ${product.productType || "Unknown"}
Tags: ${product.tags?.join(", ") || "None"}

Generate realistic, helpful pros/cons based on the product info. Include 3-5 relevant feature scores (1-10 scale). Be specific and useful.`,
    });

    const insight = JSON.parse(text);

    // Cache in backend (permanent)
    try {
      await fetch(
        `${BACKEND}/api/insights/${encodeURIComponent(handle)}?store=${encodeURIComponent(store || "")}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ insight }),
        },
      );
    } catch {
      // Cache write failure is non-fatal
    }

    return NextResponse.json(insight);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate analysis" },
      { status: 500 },
    );
  }
}
