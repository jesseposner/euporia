import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CartLine {
  id?: string;
  quantity?: number;
  merchandise?: {
    title?: string;
    price?: { amount?: string; currencyCode?: string };
  };
}

interface Cart {
  id?: string;
  checkoutUrl?: string;
  lines?: CartLine[];
  cost?: {
    totalAmount?: { amount?: string; currencyCode?: string };
  };
  totalQuantity?: number;
}

export function CartSummary({ cart }: { cart: Cart }) {
  const total = cart.cost?.totalAmount;

  return (
    <Card className="my-2">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="material-icons-round text-base">shopping_cart</span>
          Cart ({cart.totalQuantity || cart.lines?.length || 0} items)
        </div>
        {cart.lines?.map((line, i) => (
          <div
            key={line.id || i}
            className="flex items-center justify-between border-t py-2 text-sm"
          >
            <span className="text-muted-foreground">
              {line.merchandise?.title}
              {(line.quantity ?? 0) > 1 && ` x${line.quantity}`}
            </span>
            {line.merchandise?.price?.amount && (
              <span className="font-medium">
                ${line.merchandise.price.amount}
              </span>
            )}
          </div>
        ))}
        {total?.amount && (
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>${total.amount}</span>
          </div>
        )}
      </CardContent>
      {cart.checkoutUrl && (
        <CardFooter className="p-4 pt-0">
          <Button asChild className="w-full">
            <a
              href={cart.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Checkout
              <span className="material-icons-round ml-1 text-sm">
                open_in_new
              </span>
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
