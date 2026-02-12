import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/shopify";

export function ProductCard({
  product,
  index,
}: {
  product: Product;
  index?: number;
}) {
  const price = product.priceRange?.minVariantPrice;
  const image = product.images?.[0];
  const handle = product.handle;

  const card = (
    <div className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
      {image?.url && (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={image.url}
            alt={image.altText || product.title || "Product"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
          />
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-1 font-bold">
            {index !== undefined && (
              <span className="mr-1 text-muted-foreground">[{index}]</span>
            )}
            {product.title}
          </h3>
          {price?.amount && (
            <span className="font-bold text-primary">${price.amount}</span>
          )}
        </div>
        {product.description && (
          <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-end">
          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
            Details
            <span className="material-icons-round text-sm">arrow_forward</span>
          </span>
        </div>
      </div>
    </div>
  );

  if (handle) {
    return <Link href={`/products/${handle}`}>{card}</Link>;
  }

  return card;
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products?.length) return null;

  return (
    <div className="my-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard key={product.handle || i} product={product} index={i + 1} />
      ))}
    </div>
  );
}
