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

export async function searchProducts(
  query: string,
  context?: string,
): Promise<{ products: Product[] }> {
  return await callMCP(STORE, "search_shop_catalog", {
    query,
    context: context || "",
  });
}

export async function getProductDetails(
  handle: string,
): Promise<Product> {
  return await callMCP(STORE, "get_product_details", { handle });
}

export async function addToCart(
  items: { merchandiseId: string; quantity: number }[],
  cartId?: string,
): Promise<Cart> {
  const args: Record<string, unknown> = { items };
  if (cartId) args.cartId = cartId;
  return await callMCP(STORE, "update_cart", args);
}

export async function getCart(cartId: string): Promise<Cart> {
  return await callMCP(STORE, "get_cart", { cartId });
}
