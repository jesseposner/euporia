import { Sidebar } from "@/components/sidebar";
import { CartProvider } from "@/lib/cart-context";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </CartProvider>
  );
}
