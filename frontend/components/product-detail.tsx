"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
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
  const { addItem } = useCart();

  // Fetch product
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/products/${encodeURIComponent(handle)}/details`,
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
  }, [handle]);

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
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <span className="material-icons-round text-lg">arrow_back</span>
          Back to products
        </Link>

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
            <h1 className="text-2xl font-bold">{product.title}</h1>

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
            <div className="mt-6">
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
                <div className="space-y-5">
                  {/* Pros */}
                  {analysis.pros && analysis.pros.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-green-400">
                        Pros
                      </p>
                      <ul className="space-y-1">
                        {analysis.pros.map((pro, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="material-icons-round mt-0.5 text-sm text-green-400">
                              add_circle
                            </span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cons */}
                  {analysis.cons && analysis.cons.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-orange-400">
                        Cons
                      </p>
                      <ul className="space-y-1">
                        {analysis.cons.map((con, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="material-icons-round mt-0.5 text-sm text-orange-400">
                              remove_circle
                            </span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feature Scores */}
                  {analysis.features && analysis.features.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Feature Scores
                      </p>
                      <div className="space-y-2">
                        {analysis.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-28 text-xs text-muted-foreground">
                              {f.name}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${(f.score / 10) * 100}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs font-medium">
                              {f.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Who is this for */}
                  {analysis.whoIsThisFor && (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Who is this for?
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {analysis.whoIsThisFor}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  AI analysis unavailable for this product.
                </p>
              )}
            </div>
          </div>
        </div>
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
