"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AIReviewSynthesis } from "@/components/product-detail/ai-review-synthesis";
import { StickyPurchaseBar } from "@/components/product-detail/sticky-purchase-bar";
import { useCart } from "@/lib/cart-context";
import { useMerchant } from "@/lib/merchant-context";
import { getOrCreateSessionId } from "@/lib/session";
import type { Product, ProductVariant } from "@/lib/shopify";

interface AIAnalysis {
  pros?: string[];
  cons?: string[];
  whoIsThisFor?: string;
  features?: { name: string; score: number }[];
}

interface ProductDetailsResponse extends Product {
  store?: string;
}

export function ProductDetail({ handle }: { handle: string }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const [isSavingWishlist, setIsSavingWishlist] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const autoSyncedHandleRef = useRef<string | null>(null);
  const { addItem } = useCart();
  const { merchant, setMerchant, allMerchants } = useMerchant();

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    autoSyncedHandleRef.current = null;
  }, [handle]);

  const productQuery = useQuery({
    queryKey: ["product-details", handle, merchant.domain],
    queryFn: async (): Promise<ProductDetailsResponse | null> => {
      const res = await fetch(
        `/api/products/${encodeURIComponent(handle)}/details?store=${encodeURIComponent(merchant.domain)}`,
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product details");
      return (await res.json()) as ProductDetailsResponse;
    },
  });

  const productResponse = productQuery.data;
  const product = (productResponse || null) as Product | null;
  const resolvedStore = productResponse?.store || merchant.domain;

  const analysisQuery = useQuery({
    queryKey: ["product-analysis", handle, resolvedStore],
    enabled: !!product,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<AIAnalysis | null> => {
      const cacheRes = await fetch(
        `/api/products/${encodeURIComponent(handle)}/analysis?store=${encodeURIComponent(resolvedStore)}`,
      );
      if (cacheRes.ok) {
        return (await cacheRes.json()) as AIAnalysis;
      }

      const genRes = await fetch(
        `/api/products/${encodeURIComponent(handle)}/analysis?store=${encodeURIComponent(resolvedStore)}`,
        { method: "POST" },
      );
      if (genRes.ok) {
        return (await genRes.json()) as AIAnalysis;
      }

      return null;
    },
  });

  const analysis = analysisQuery.data || null;

  useEffect(() => {
    if (!productResponse) return;

    const matchedStore = productResponse.store || merchant.domain;
    const matchedMerchant = allMerchants.find(
      (candidate) => candidate.domain === matchedStore,
    );

    if (
      matchedMerchant &&
      matchedMerchant.id !== merchant.id &&
      autoSyncedHandleRef.current !== handle
    ) {
      autoSyncedHandleRef.current = handle;
      setMerchant(matchedMerchant);
    }
  }, [allMerchants, handle, merchant.domain, merchant.id, productResponse, setMerchant]);

  useEffect(() => {
    setSelectedImage(0);
    setSelectedVariant(product?.variants?.[0] || null);
  }, [handle, product?.handle, product?.variants]);

  // Intersection observer for sticky purchase bar
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const syncWishlistState = useCallback(
    async (currentSessionId: string) => {
      try {
        const res = await fetch(
          `/api/wishlist?sessionId=${encodeURIComponent(currentSessionId)}`,
        );
        if (!res.ok) return;

        const data = await res.json();
        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.wishlist)
            ? data.wishlist
            : [];

        const matchingItem = items.find(
          (item: { id?: string; product_handle?: string }) =>
            item.product_handle === handle,
        );

        setIsWishlisted(!!matchingItem);
        setWishlistItemId(matchingItem?.id || null);
      } catch {
        // Best effort refresh
      }
    },
    [handle],
  );

  useEffect(() => {
    if (!sessionId) return;
    void syncWishlistState(sessionId);
  }, [sessionId, syncWishlistState]);

  async function toggleWishlist() {
    if (!sessionId || isSavingWishlist) return;

    setIsSavingWishlist(true);
    try {
      if (isWishlisted) {
        if (wishlistItemId) {
          await fetch(
            `/api/wishlist/${encodeURIComponent(wishlistItemId)}?sessionId=${encodeURIComponent(sessionId)}`,
            { method: "DELETE" },
          );
        }
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            product_handle: handle,
            product_title: product?.title,
            product_image: product?.images?.[0]?.url,
            product_price: selectedVariant?.price?.amount || product?.priceRange?.minVariantPrice?.amount,
          }),
        });
      }

      await syncWishlistState(sessionId);
    } finally {
      setIsSavingWishlist(false);
    }
  }

  async function handleAddToCart() {
    if (!selectedVariant?.id) return;
    setIsAdding(true);
    try {
      await addItem(selectedVariant.id, 1);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } finally {
      setIsAdding(false);
    }
  }

  if (productQuery.isPending) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="material-icons-round mb-3 text-4xl text-muted-foreground opacity-30">
          error_outline
        </span>
        <p className="text-sm text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const images = product.images || [];
  const price =
    selectedVariant?.price || product.priceRange?.minVariantPrice;
  const variants = product.variants || [];
  const hasMultipleVariants =
    variants.length > 1 ||
    (variants.length === 1 && variants[0].title !== "Default Title");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                {product.productType || "Products"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Image Gallery */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
              {images[selectedImage]?.url ? (
                <Image
                  src={images[selectedImage].url!}
                  alt={
                    images[selectedImage].altText || product.title || "Product"
                  }
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="material-icons-round text-5xl text-muted-foreground opacity-20">
                    image
                  </span>
                </div>
              )}
              {/* Verified Authentic Badge */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-1 text-xs font-medium text-white">
                <span className="material-icons-round text-sm">verified</span>
                Verified Authentic
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative size-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImage === i
                        ? "border-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {img.url && (
                      <Image
                        src={img.url}
                        alt={img.altText || ""}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div>
            <div className="flex items-start">
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <button
                onClick={toggleWishlist}
                disabled={!sessionId || isSavingWishlist}
                className="ml-2 rounded-full p-1.5 transition-colors hover:bg-accent"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <span
                  className={`material-icons-round text-xl ${isWishlisted ? "text-red-500" : "text-muted-foreground"}`}
                >
                  {isWishlisted ? "favorite" : "favorite_border"}
                </span>
              </button>
            </div>

            {/* Star Rating */}
            {analysis?.features && (
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg =
                      analysis.features!.reduce((s, f) => s + f.score, 0) /
                      analysis.features!.length;
                    const normalizedRating = (avg / 10) * 5;
                    return (
                      <span
                        key={star}
                        className={`material-icons-round text-sm ${star <= normalizedRating ? "text-yellow-400" : "text-muted-foreground/30"}`}
                      >
                        star
                      </span>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground">AI Score</span>
              </div>
            )}

            {price?.amount && (
              <p className="mt-2 text-3xl font-bold text-primary">
                ${price.amount}
                {price.currencyCode && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {price.currencyCode}
                  </span>
                )}
              </p>
            )}

            {product.description && (
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Variant Selector */}
            {hasMultipleVariants && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">Variant</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={!v.availableForSale}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        selectedVariant?.id === v.id
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : v.availableForSale
                            ? "border-border hover:border-primary/50"
                            : "cursor-not-allowed border-border/50 text-muted-foreground/40 line-through"
                      }`}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <div className="mt-6" ref={ctaRef}>
              <Button
                onClick={handleAddToCart}
                disabled={
                  isAdding ||
                  !selectedVariant?.id ||
                  !selectedVariant?.availableForSale
                }
                className="h-12 w-full text-base shadow-lg shadow-primary/20"
                size="lg"
              >
                {addedToCart ? (
                  <>
                    <span className="material-icons-round mr-2 text-lg">
                      check
                    </span>
                    Added to Cart
                  </>
                ) : isAdding ? (
                  <>
                    <span className="material-icons-round mr-2 animate-spin text-lg">
                      progress_activity
                    </span>
                    Adding...
                  </>
                ) : (
                  <>
                    <span className="material-icons-round mr-2 text-lg">
                      add_shopping_cart
                    </span>
                    Add to Cart
                  </>
                )}
              </Button>
              {selectedVariant && !selectedVariant.availableForSale && (
                <p className="mt-2 text-center text-sm text-destructive">
                  This variant is currently out of stock
                </p>
              )}
            </div>

            {/* AI Analysis Section */}
            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="material-icons-round text-lg text-primary">
                  auto_awesome
                </span>
                <h2 className="font-semibold">AI Review Synthesis</h2>
              </div>

              {analysisQuery.isPending ? (
                <AnalysisLoadingState />
              ) : analysis ? (
                <AIReviewSynthesis analysis={analysis} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  AI analysis unavailable for this product.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Purchase Bar */}
      <StickyPurchaseBar
        price={price?.amount}
        currencyCode={price?.currencyCode}
        variantId={selectedVariant?.id}
        visible={showStickyBar}
        disabled={isAdding || !selectedVariant?.availableForSale}
        onAdd={async (quantity) => {
          if (!selectedVariant?.id) return;
          setIsAdding(true);
          try {
            await addItem(selectedVariant.id, quantity);
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
          } finally {
            setIsAdding(false);
          }
        }}
      />
    </div>
  );
}

const ANALYSIS_STEPS = [
  "Reading product details...",
  "Analyzing features...",
  "Evaluating pros & cons...",
  "Scoring attributes...",
  "Synthesizing review...",
];

function AnalysisLoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % ANALYSIS_STEPS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      {/* Status message */}
      <div className="flex items-center gap-3">
        <span className="material-icons-round animate-spin text-base text-primary">
          progress_activity
        </span>
        <span className="text-sm font-medium text-primary transition-all duration-300">
          {ANALYSIS_STEPS[step]}
        </span>
      </div>

      {/* Shimmer pros/cons cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-green-500/10 bg-green-500/5 p-4">
          <Skeleton className="mb-3 h-4 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/6" />
          </div>
        </div>
        <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4">
          <Skeleton className="mb-3 h-4 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/6" />
          </div>
        </div>
      </div>

      {/* Shimmer feature bars */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2 flex-1 rounded-full" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>

      {/* Shimmer "who is this for" */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Skeleton className="mb-6 h-5 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
