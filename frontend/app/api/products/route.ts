import { NextRequest, NextResponse } from "next/server";
import { searchProducts, type Product, type SearchResult } from "@/lib/shopify";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const store = req.nextUrl.searchParams.get("store") || undefined;
  const limitParam = Number.parseInt(req.nextUrl.searchParams.get("limit") || "", 10);
  const pagesParam = Number.parseInt(req.nextUrl.searchParams.get("pages") || "", 10);
  const limit = Number.isFinite(limitParam) ? clampNumber(limitParam, 1, 60) : 24;
  const maxPages = Number.isFinite(pagesParam) ? clampNumber(pagesParam, 1, 6) : 3;

  try {
    const products: Product[] = [];
    const seen = new Set<string>();
    let availableFilters: SearchResult["availableFilters"];
    let after: string | undefined;
    let hasNextPage = false;
    let endCursor: string | undefined;

    for (let page = 0; page < maxPages && products.length < limit; page += 1) {
      const result = await searchProducts(query, undefined, undefined, after, store);

      if (!availableFilters && result.availableFilters) {
        availableFilters = result.availableFilters;
      }

      for (const product of result.products || []) {
        const key =
          product.productId ||
          product.handle ||
          `${product.title || "product"}:${products.length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        products.push(product);
        if (products.length >= limit) break;
      }

      if (!result.pagination?.hasNextPage || !result.pagination.endCursor) {
        hasNextPage = false;
        endCursor = undefined;
        break;
      }

      hasNextPage = true;
      endCursor = result.pagination.endCursor;
      after = result.pagination.endCursor;
    }

    return NextResponse.json({
      products,
      pagination: {
        hasNextPage,
        endCursor: hasNextPage ? endCursor : null,
      },
      availableFilters,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to search products" },
      { status: 500 },
    );
  }
}
