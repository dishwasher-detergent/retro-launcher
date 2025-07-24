import { Preview } from "@/components/preview";
import { useCartridge } from "@/hooks/cartridge.hook";

export function HomePage() {
  const { lastCartridge, isLoading } = useCartridge();

  if (isLoading) {
    return (
      <div className="bg-background text-foreground flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Current Cartridge</h1>
      <div>
        {lastCartridge ? (
          <Preview
            name={lastCartridge.name}
            pathName={lastCartridge.pathName}
          />
        ) : (
          <div className="text-center p-2 text-muted-foreground">
            <p className="font-semibold">No cartridge detected</p>
            <p className="text-sm">Place a cartridge in the reader.</p>
          </div>
        )}
      </div>
    </>
  );
}
