import { Preview } from "@/components/preview";
import { useCartridge } from "@/hooks/cartridge.hook";

export function HomePage() {
  const { lastCartridge } = useCartridge();

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Current Cartridge</h1>
      <p>{lastCartridge?.name}</p>
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
