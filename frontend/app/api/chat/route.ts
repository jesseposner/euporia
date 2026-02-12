import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  searchProducts,
  getProductDetails,
  addToCart,
  getCart,
  updateCartItems,
  removeFromCart,
  applyDiscountCode,
  searchPolicies,
  type SearchFilter,
} from "@/lib/shopify";

export const maxDuration = 60;

const BACKEND = process.env.BACKEND_URL || "http://localhost:3010";

const SYSTEM_PROMPT = `You are ShopAI, a personal shopping concierge for this store. Your job is to actively browse and shop the catalog on behalf of the user.

CORE PRINCIPLE:
You are a personal shopper — not a general chatbot. Every response should move toward finding and presenting real products from the store. When the user says something like "find me something cool", "pick out gifts", or "surprise me", immediately search the catalog. Don't ask what they want — go shop for them and bring back options.

FIRST MESSAGE BEHAVIOR:
- Call loadTasteProfile to check if this is a returning user.
- If a profile exists, greet them briefly, then proactively search for products they'd like based on their profile. Show products right away.
- If no profile exists, introduce yourself in one sentence, ask one quick question about what they're into, then search immediately.

TASTE DISCOVERY:
- Learn preferences organically through what they pick and reject, not through interviews.
- After a couple of interactions, call saveTasteProfile with what you've learned.
- Use their taste as context in every search to improve results.

SHOPPING BEHAVIOR:
- Be proactive. If the user gives a vague request ("something for my friend", "cool stuff"), pick 2-3 search terms and run multiple searches to cast a wide net.
- Always search the catalog — never recommend products from memory or make up items.
- Present products with title, price, and a short reason why it fits what they asked for.
- Number them [1], [2], [3] so the user can pick by number.
- If results don't match well, try different search terms automatically.
- Suggest related items or categories the user might not have thought of.
- Use filters from available_filters in search results for refined follow-up searches (price range, product type, size, color).
- Use pagination (the "after" cursor) when the user wants to see more results.

PRODUCT SELECTION:
- When the user picks a product, call getProductDetails with the product_id from search results to get full variant info.
- You can pass specific options like {"Size": "Large"} to select a variant directly.
- Confirm their preferred variant before adding to cart.
- If a variant combo isn't available, show what is available.

CART MANAGEMENT:
- Use addToCart to add items (creates a new cart automatically if needed).
- Use updateCartItems to change quantities or removeFromCart to remove items.
- Use applyDiscountCode if the user has a promo code.
- Present the checkout link so the user can complete their purchase.
- Suggest complementary items before they check out.

STORE QUESTIONS:
- Use searchPolicies for questions about returns, shipping, store hours, contact info, etc.

RULES:
- Never make up product details — only cite what the tools return.
- Be concise. Brief commentary, then show the products.
- If a tool fails, try once more with different terms.
- You only have access to this store's inventory. Don't reference products outside of it.`;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") || "demo";
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      searchProducts: tool({
        description:
          "Search the store catalog for products. Supports natural language queries, filters (price range, product type, size/color), and pagination. Returns products with available_filters you can use in follow-up searches. Call this proactively — don't wait for the user to ask.",
        inputSchema: z.object({
          query: z.string().describe("Natural language search query"),
          context: z
            .string()
            .optional()
            .describe("User taste/preference context to improve results"),
          filters: z
            .array(
              z.object({
                available: z.boolean().optional(),
                price: z
                  .object({ min: z.number().optional(), max: z.number().optional() })
                  .optional()
                  .describe("Price range filter"),
                productType: z.string().optional(),
                tag: z.string().optional(),
                variantOption: z
                  .object({ name: z.string(), value: z.string() })
                  .optional()
                  .describe("Filter by variant like Size or Color"),
              }),
            )
            .optional()
            .describe("Filters from available_filters in a previous search result"),
          after: z
            .string()
            .optional()
            .describe("Pagination cursor (endCursor from previous result) to load more"),
        }),
        execute: async ({ query, context, filters, after }) => {
          return await searchProducts(
            query,
            context,
            filters as SearchFilter[] | undefined,
            after,
          );
        },
      }),

      getProductDetails: tool({
        description:
          "Get full details for a specific product by its product_id (from search results). Returns variants with sizes, colors, availability, and pricing. Optionally select a specific variant.",
        inputSchema: z.object({
          productId: z
            .string()
            .describe("Product ID like gid://shopify/Product/123 from search results"),
          options: z
            .record(z.string(), z.string())
            .optional()
            .describe('Variant options to select, e.g. {"Size": "Large", "Color": "Black"}'),
        }),
        execute: async ({ productId, options }) => {
          return await getProductDetails(productId, options);
        },
      }),

      addToCart: tool({
        description:
          "Add items to the shopping cart. Creates a new cart if no cartId is provided. Returns the cart with a checkout URL.",
        inputSchema: z.object({
          items: z
            .array(
              z.object({
                merchandiseId: z
                  .string()
                  .describe("The variant_id (gid://shopify/ProductVariant/...) to add"),
                quantity: z.number().describe("Quantity to add"),
              }),
            )
            .describe("Items to add to cart"),
          cartId: z
            .string()
            .optional()
            .describe("Existing cart ID to add to. Omit to create a new cart."),
        }),
        execute: async ({ items, cartId }) => {
          return await addToCart(items, cartId);
        },
      }),

      updateCartItems: tool({
        description:
          "Update quantities of items already in the cart. Set quantity to 0 to remove an item.",
        inputSchema: z.object({
          cartId: z.string().describe("The cart ID"),
          updates: z
            .array(
              z.object({
                lineId: z.string().describe("The cart line item ID to update"),
                quantity: z.number().describe("New quantity (0 to remove)"),
              }),
            )
            .describe("Items to update"),
        }),
        execute: async ({ cartId, updates }) => {
          return await updateCartItems(cartId, updates);
        },
      }),

      removeFromCart: tool({
        description: "Remove items from the cart by their line item IDs.",
        inputSchema: z.object({
          cartId: z.string().describe("The cart ID"),
          lineIds: z.array(z.string()).describe("Line item IDs to remove"),
        }),
        execute: async ({ cartId, lineIds }) => {
          return await removeFromCart(cartId, lineIds);
        },
      }),

      applyDiscountCode: tool({
        description: "Apply a discount or promo code to the cart.",
        inputSchema: z.object({
          cartId: z.string().describe("The cart ID"),
          codes: z.array(z.string()).describe("Discount/promo codes to apply"),
        }),
        execute: async ({ cartId, codes }) => {
          return await applyDiscountCode(cartId, codes);
        },
      }),

      getCart: tool({
        description: "Get the current state of a shopping cart including items, totals, and checkout URL.",
        inputSchema: z.object({
          cartId: z.string().describe("The cart ID to retrieve"),
        }),
        execute: async ({ cartId: id }) => {
          return await getCart(id);
        },
      }),

      searchPolicies: tool({
        description:
          "Search the store's policies, FAQs, and general info. Use for questions about returns, shipping, hours, contact info, etc.",
        inputSchema: z.object({
          query: z.string().describe("The policy/FAQ question"),
        }),
        execute: async ({ query }) => {
          return await searchPolicies(query);
        },
      }),

      loadTasteProfile: tool({
        description:
          "Load a returning user's saved taste profile. Call this at the start of every conversation.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const res = await fetch(
              `${BACKEND}/api/profiles/${encodeURIComponent(sessionId)}`,
            );
            if (!res.ok) return { found: false };
            const data = await res.json();
            return { found: true, profile: data.profile };
          } catch {
            return { found: false };
          }
        },
      }),

      saveTasteProfile: tool({
        description:
          "Save or update the user's taste profile after learning their preferences.",
        inputSchema: z.object({
          profile: z
            .record(z.string(), z.unknown())
            .describe(
              "JSON object with user preferences: brands, styles, budget, colors, occasions, etc.",
            ),
        }),
        execute: async ({ profile }) => {
          const res = await fetch(
            `${BACKEND}/api/profiles/${encodeURIComponent(sessionId)}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ profile }),
            },
          );
          if (!res.ok) throw new Error("Failed to save profile");
          return { saved: true };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
