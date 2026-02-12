import { callMCP } from "@/lib/shopify-mcp";

const STORE = process.env.SHOPIFY_STORE || "store.bitcoinmagazine.com";

export interface ProductImage {
  url?: string;
  altText?: string;
}

export interface ProductVariant {
  id?: string;
  title?: string;
  availableForSale?: boolean;
  price?: { amount?: string; currencyCode?: string };
  selectedOptions?: { name?: string; value?: string }[];
}

export interface Product {
  title?: string;
  handle?: string;
  description?: string;
  descriptionHtml?: string;
  priceRange?: {
    minVariantPrice?: { amount?: string; currencyCode?: string };
    maxVariantPrice?: { amount?: string; currencyCode?: string };
  };
  images?: ProductImage[];
  variants?: ProductVariant[];
  availableForSale?: boolean;
  productType?: string;
  tags?: string[];
}

export interface CartLine {
  id?: string;
  quantity?: number;
  merchandise?: {
    id?: string;
    title?: string;
    product?: { handle?: string; title?: string };
    price?: { amount?: string; currencyCode?: string };
    image?: ProductImage;
  };
}

export interface Cart {
  id?: string;
  checkoutUrl?: string;
  lines?: CartLine[];
  cost?: {
    totalAmount?: { amount?: string; currencyCode?: string };
    subtotalAmount?: { amount?: string; currencyCode?: string };
  };
  totalQuantity?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(raw: any): Product {
  // Extract handle from URL like "https://store.../products/the-core-issue-40"
  const handle = raw.handle ?? raw.url?.split("/products/")[1] ?? undefined;

  // Normalize images
  const images: ProductImage[] = [];
  if (raw.images) {
    images.push(...raw.images);
  } else if (raw.image_url) {
    images.push({ url: raw.image_url, altText: raw.image_alt_text });
  }

  // Normalize price range
  const priceRange = raw.priceRange ?? (raw.price_range
    ? {
        minVariantPrice: {
          amount: raw.price_range.min,
          currencyCode: raw.price_range.currency,
        },
        maxVariantPrice: {
          amount: raw.price_range.max,
          currencyCode: raw.price_range.currency,
        },
      }
    : undefined);

  // Normalize variants
  const variants: ProductVariant[] | undefined = raw.variants?.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v: any) => ({
      id: v.id ?? v.variant_id,
      title: v.title,
      availableForSale: v.availableForSale ?? v.available ?? true,
      price: v.price
        ? typeof v.price === "object"
          ? v.price
          : { amount: v.price, currencyCode: v.currency ?? priceRange?.minVariantPrice?.currencyCode }
        : undefined,
      selectedOptions: v.selectedOptions,
    }),
  );

  return {
    title: raw.title,
    handle,
    description: raw.description,
    descriptionHtml: raw.descriptionHtml,
    priceRange,
    images,
    variants,
    availableForSale: raw.availableForSale ?? raw.available,
    productType: raw.productType ?? raw.product_type,
    tags: raw.tags,
  };
}

export async function searchProducts(
  query: string,
  context?: string,
): Promise<{ products: Product[] }> {
  const raw = await callMCP(STORE, "search_shop_catalog", {
    query,
    context: context || "",
  });
  return {
    products: (raw.products || []).map(normalizeProduct),
  };
}

export async function getProductDetails(
  handle: string,
): Promise<Product | null> {
  // The MCP get_product_details requires product_id, not handle.
  // Search by handle and match the result instead.
  const result = await searchProducts(handle);
  return result.products.find((p) => p.handle === handle) ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCart(raw: any): Cart {
  // MCP wraps cart data under "cart" key with snake_case
  const c = raw.cart ?? raw;
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl ?? c.checkout_url,
    totalQuantity: c.totalQuantity ?? c.total_quantity ?? 0,
    cost: c.cost
      ? {
          totalAmount: c.cost.totalAmount ?? c.cost.total_amount,
          subtotalAmount: c.cost.subtotalAmount ?? c.cost.subtotal_amount,
        }
      : undefined,
    lines: (c.lines ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (line: any) => ({
        id: line.id,
        quantity: line.quantity,
        merchandise: line.merchandise,
      }),
    ),
  };
}

export async function addToCart(
  items: { merchandiseId: string; quantity: number }[],
  cartId?: string,
): Promise<Cart> {
  const args: Record<string, unknown> = {
    add_items: items.map((i) => ({
      product_variant_id: i.merchandiseId,
      quantity: i.quantity,
    })),
  };
  if (cartId) args.cart_id = cartId;
  const raw = await callMCP(STORE, "update_cart", args);
  return normalizeCart(raw);
}

export async function getCart(cartId: string): Promise<Cart> {
  const raw = await callMCP(STORE, "get_cart", { cart_id: cartId });
  return normalizeCart(raw);
}
