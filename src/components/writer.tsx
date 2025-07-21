import { Copy, Download, Zap } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Preview } from "@/components/ui/preview";
import { NFCCardData } from "@/types/electron";

export function Writer() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [iconData, setIconData] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState<boolean>(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFilePath(file.path || file.name);
    }
  };

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 16;
        canvas.height = 16;

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, 16, 16);

          const resizedDataUrl = canvas.toDataURL("image/png");
          setIconData(resizedDataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleWrite = () => {
    if (!filePath || !name) {
      alert("Please fill in all required fields");
      return;
    }

    const cardData: NFCCardData = {
      name: name,
      icon: iconData,
      pathName: filePath,
    };

    const jsonString = JSON.stringify(cardData, null, 2);
    setJsonOutput(jsonString);
    setShowOutput(true);
  };

  const copyToClipboard = async () => {
    if (!jsonOutput) {
      return;
    }

    try {
      await navigator.clipboard.writeText(jsonOutput);
      alert("JSON copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      alert("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const canWrite = filePath && name;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          placeholder="Enter a name for this cartridge..."
          maxLength={50}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-path">Application Path *</Label>
        <div className="flex gap-2">
          <Input
            id="file-path"
            value={filePath || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilePath(e.target.value)
            }
            placeholder="Select an application to launch..."
            className="flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".exe,.bat,.cmd,.lnk"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="icon-upload">
          Upload Icon (optional - will be resized to 16x16)
        </Label>
        <div className="flex gap-2 items-center">
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            onChange={handleIconUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => iconInputRef.current?.click()}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Choose Image
          </Button>
          {iconData && (
            <div className="w-8 h-8 border rounded flex items-center justify-center bg-muted overflow-hidden">
              <img src={iconData} alt="Icon preview" className="size-full" />
            </div>
          )}
        </div>
      </div>
      {canWrite && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className=" bg-background p-2 rounded-lg">
            <Preview name={name} icon={iconData} pathName={filePath} />
          </div>
        </div>
      )}
      <Button onClick={handleWrite} disabled={!canWrite} className="w-full">
        <Zap className="h-4 w-4 mr-2" />
        Generate Cartridge Data
      </Button>
      {showOutput && (
        <div className="space-y-2">
          <Label>Generated JSON Data</Label>
          <div className="relative">
            <textarea
              value={jsonOutput || ""}
              readOnly
              className="bg-background w-full h-32 p-3 text-sm font-mono border rounded-md resize-none"
              placeholder="Generated JSON will appear here..."
            />
            <Button
              onClick={copyToClipboard}
              size="icon"
              className="absolute top-2 right-2"
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy this JSON data and paste it to your NFC card using your
            preferred NFC writing tool.
          </p>
        </div>
      )}
    </div>
  );
}
