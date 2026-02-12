import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  title?: string;
  handle?: string;
  description?: string;
  priceRange?: {
    minVariantPrice?: { amount?: string; currencyCode?: string };
  };
  images?: { url?: string; altText?: string }[];
  availableForSale?: boolean;
}

export function ProductCard({
  product,
  index,
}: {
  product: Product;
  index?: number;
}) {
  const price = product.priceRange?.minVariantPrice;
  const image = product.images?.[0];

  return (
    <Card className="overflow-hidden py-0 gap-0">
      {image?.url && (
        <div className="relative aspect-square w-full bg-muted">
          <Image
            src={image.url}
            alt={image.altText || product.title || "Product"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
          />
        </div>
      )}
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-tight">
            {index !== undefined && (
              <span className="text-muted-foreground mr-1">[{index}]</span>
            )}
            {product.title}
          </h3>
          {price?.amount && (
            <span className="text-sm font-semibold whitespace-nowrap">
              ${price.amount}
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
            {product.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products?.length) return null;

  return (
    <div className="my-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard key={product.handle || i} product={product} index={i + 1} />
      ))}
    </div>
  );
}
