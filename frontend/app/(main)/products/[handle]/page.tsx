export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <span className="material-icons-round mb-4 text-5xl text-muted-foreground opacity-30">
        inventory_2
      </span>
      <h1 className="text-xl font-semibold">Product Detail</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Viewing: {handle}
      </p>
    </div>
  );
}
