import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/shopify";
import { merchants } from "@/lib/merchants";

const HANDLE_SCAN_PAGES = 1;

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferStoreFromHandle(handle: string): string | undefined {
  const normalizedHandle = normalizeToken(handle);

  for (const merchant of merchants) {
    const candidates = [
      merchant.id,
      merchant.name,
      merchant.domain.split(".")[0] || "",
    ];
    if (candidates.some((candidate) => normalizedHandle.startsWith(normalizeToken(candidate)))) {
      return merchant.domain;
    }
  }

  return undefined;
}

function getStoreSearchOrder(handle: string, preferredStore?: string): string[] {
  const inferredStore = inferStoreFromHandle(handle);
  const priority = Array.from(
    new Set([preferredStore, inferredStore].filter((domain): domain is string => Boolean(domain))),
  );

  return [
    ...priority,
    ...merchants
      .map((merchant) => merchant.domain)
      .filter((domain) => !priority.includes(domain)),
  ];
}

function buildHandleQueries(handle: string): string[] {
  const normalized = handle.trim();
  const primary = normalized.split("-").slice(0, 6).join(" ");

  return Array.from(
    new Set([normalized, primary].filter((value) => value.length > 0)),
  );
}

async function findProductInStore(handle: string, store: string) {
  const queries = buildHandleQueries(handle);

  for (const query of queries) {
    const result = await searchProducts(query, undefined, undefined, undefined, store);
    const product = result.products.find((candidate) => candidate.handle === handle);
    if (product) return product;
  }

  let after: string | undefined;

  for (let page = 0; page < HANDLE_SCAN_PAGES; page += 1) {
    const result = await searchProducts("", undefined, undefined, after, store);
    const product = result.products.find((candidate) => candidate.handle === handle);
    if (product) return product;

    if (!result.pagination?.hasNextPage || !result.pagination.endCursor) {
      break;
    }

    after = result.pagination.endCursor;
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const store = req.nextUrl.searchParams.get("store") || undefined;

  try {
    const storeSearchOrder = getStoreSearchOrder(handle, store);
    let matchedProduct: Awaited<ReturnType<typeof findProductInStore>> = null;
    let matchedStore: string | null = null;

    for (const domain of storeSearchOrder) {
      matchedProduct = await findProductInStore(handle, domain);
      if (matchedProduct) {
        matchedStore = domain;
        break;
      }
    }

    if (!matchedProduct || !matchedStore) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...matchedProduct,
      store: matchedStore,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Product not found" },
      { status: 404 },
    );
  }
}
