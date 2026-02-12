import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/shopify";

export interface ProductBadge {
  label: string;
  variant: "top-pick" | "sale" | "new";
}

interface ProductCardProps {
  product: Product;
  index?: number;
  badge?: ProductBadge;
}

function extractCategory(productType?: string, tags?: string[]): string {
  if (productType) return productType;
  if (tags?.length) return tags[0];
  return "Product";
}

export function ProductCard({ product, badge }: ProductCardProps) {
  const price = product.priceRange?.minVariantPrice;
  const image = product.images?.[0];
  const handle = product.handle;
  const category = extractCategory(product.productType, product.tags);

  const card = (
    <div className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image?.url ? (
          <Image
            src={image.url}
            alt={image.altText || product.title || "Product"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-icons-round text-4xl text-muted-foreground/20">
              image
            </span>
          </div>
        )}
        {badge && (
          <div className={cn(
            "absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            badge.variant === "top-pick" && "bg-yellow-500/90 text-black",
            badge.variant === "sale" && "bg-red-500/90 text-white",
            badge.variant === "new" && "bg-primary/90 text-white",
          )}>
            {badge.label}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Category */}
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          {category}
        </p>

        {/* Title */}
        <h3 className="line-clamp-1 text-sm font-semibold">
          {product.title}
        </h3>

        {/* Price + Add to cart */}
        <div className="mt-3 flex items-center justify-between">
          {price?.amount ? (
            <span className="text-lg font-bold text-primary">
              ${price.amount}
            </span>
          ) : (
            <span />
          )}
          <button className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white">
            <span className="material-icons-round text-lg">
              add_shopping_cart
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (handle) {
    return <Link href={`/products/${handle}`}>{card}</Link>;
  }

  return card;
}

export function ProductGrid({
  products,
  badges,
}: {
  products: Product[];
  badges?: Record<string, ProductBadge>;
}) {
  if (!products?.length) return null;

  return (
    <div className="my-2 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard
          key={product.handle || i}
          product={product}
          badge={product.handle ? badges?.[product.handle] : undefined}
        />
      ))}
    </div>
  );
}
