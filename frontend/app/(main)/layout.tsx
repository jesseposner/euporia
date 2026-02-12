import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { CartProvider } from "@/lib/cart-context";
import { MerchantProvider } from "@/lib/merchant-context";
import { QueryProvider } from "@/lib/query-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <MerchantProvider>
        <CartProvider>
          <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <MobileHeader />
              <main className="relative flex flex-1 flex-col overflow-hidden">
                {children}
              </main>
            </div>
          </div>
        </CartProvider>
      </MerchantProvider>
    </QueryProvider>
  );
}
