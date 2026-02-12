import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { callMCP } from "@/lib/shopify-mcp";
import { getModel } from "@/lib/llm";

export const maxDuration = 60;

const STORE = process.env.SHOPIFY_STORE || "store.bitcoinmagazine.com";
const BACKEND = process.env.BACKEND_URL || "http://localhost:3010";

const SYSTEM_PROMPT = `You are ShopAI, a personal shopping concierge. You help people discover products they'll love.

FIRST MESSAGE BEHAVIOR:
- Call loadTasteProfile to check if this is a returning user.
- If a profile exists, greet them warmly and reference their preferences. Ask what they're looking for today.
- If no profile exists, introduce yourself briefly and start learning their taste through natural conversation.

TASTE DISCOVERY (for new users):
- Ask about their style, favorite brands, budget range, and what they're shopping for.
- Keep it conversational, not interrogative. 2-3 questions max before offering to search.
- After learning enough, call saveTasteProfile with a JSON summary of their preferences.

PRODUCT SEARCH:
- When searching, include the user's taste as context for better results.
- Present products with title, price, and a brief description.
- Number them [1], [2], [3] so the user can pick by number.
- If search returns no results, suggest broader terms or different categories.

PRODUCT SELECTION:
- When the user picks a product, call getProductDetails for available variants.
- Confirm their preferred variant (size, color, etc.) before adding to cart.
- If a variant combo isn't available, show what is available.

CART & CHECKOUT:
- After confirming, add to cart with addToCart.
- Present the checkout link so the user can complete their purchase.
- The user can add more items before checking out.

RULES:
- Never make up product details — only cite what the tools return.
- Be concise and helpful.
- If a tool fails, tell the user briefly and try once more.
- When presenting products, focus on the most relevant details.`;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") || "demo";
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      searchProducts: tool({
        description:
          "Search the Shopify store for products matching a query. Use the context parameter to include user taste preferences for better results.",
        inputSchema: z.object({
          query: z.string().describe("Natural language search query"),
          context: z
            .string()
            .optional()
            .describe("User taste/preference context to improve results"),
        }),
        execute: async ({ query, context }) => {
          return await callMCP(STORE, "search_shop_catalog", {
            query,
            context: context || "",
          });
        },
      }),

      getProductDetails: tool({
        description:
          "Get detailed information about a specific product including available variants, sizes, colors, and pricing.",
        inputSchema: z.object({
          handle: z
            .string()
            .describe("Product handle (URL slug) from search results"),
        }),
        execute: async ({ handle }) => {
          return await callMCP(STORE, "get_product_details", { handle });
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
                  .describe("The variant/merchandise ID to add"),
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
          const args: Record<string, unknown> = { items };
          if (cartId) args.cartId = cartId;
          return await callMCP(STORE, "update_cart", args);
        },
      }),

      getCart: tool({
        description: "Get the current state of a shopping cart.",
        inputSchema: z.object({
          cartId: z.string().describe("The cart ID to retrieve"),
        }),
        execute: async ({ cartId }) => {
          return await callMCP(STORE, "get_cart", { cartId });
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
          "Save or update the user's taste profile after learning their preferences. Store brands, styles, budget, colors, and any other preference details.",
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
