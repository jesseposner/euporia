"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { Product, ProductVariant } from "@/lib/shopify";

interface AIAnalysis {
  pros?: string[];
  cons?: string[];
  whoIsThisFor?: string;
  features?: { name: string; score: number }[];
}

export function ProductDetail({ handle }: { handle: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { merchant } = useMerchant();

  // Fetch product
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/products/${encodeURIComponent(handle)}/details?store=${encodeURIComponent(merchant.domain)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
          if (data.variants?.length) {
            setSelectedVariant(data.variants[0]);
          }
        }
      } catch {
        // Product not found
      } finally {
        setIsLoadingProduct(false);
      }
    }
    load();
  }, [handle, merchant.domain]);

  // Fetch AI analysis
  const fetchAnalysis = useCallback(async () => {
    setIsLoadingAnalysis(true);
    try {
      // Try cache first
      const cacheRes = await fetch(
        `/api/products/${encodeURIComponent(handle)}/analysis`,
      );
      if (cacheRes.ok) {
        setAnalysis(await cacheRes.json());
        return;
      }

      // Generate new analysis
      const genRes = await fetch(
        `/api/products/${encodeURIComponent(handle)}/analysis`,
        { method: "POST" },
      );
      if (genRes.ok) {
        setAnalysis(await genRes.json());
      }
    } catch {
      // Analysis unavailable
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [handle]);

  useEffect(() => {
    if (product) {
      fetchAnalysis();
    }
  }, [product, fetchAnalysis]);

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

  async function toggleWishlist() {
    const next = !isWishlisted;
    setIsWishlisted(next);
    try {
      await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
    } catch {
      setIsWishlisted(!next); // revert on failure
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

  if (isLoadingProduct) {
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

              {isLoadingAnalysis ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="mt-4 h-20 w-full" />
                </div>
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
