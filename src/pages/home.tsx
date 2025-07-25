import { Preview } from "@/components/preview";
import { useCartridge } from "@/hooks/cartridge.hook";
import { useLauncher } from "@/hooks/launch.hook";

export function HomePage() {
  const { lastCartridge } = useCartridge();
  const { launchCartridge, isLaunching } = useLauncher();

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Current Cartridge</h1>
      <div>
        {lastCartridge ? (
          <Preview
            name={lastCartridge.name}
            launchCartridge={launchCartridge}
            isLaunching={isLaunching}
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
