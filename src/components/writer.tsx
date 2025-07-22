import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Download, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Preview } from "@/components/preview";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NFCCardData } from "@/types/electron";

const CartridgeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Name must be 64 characters or less"),
  pathName: z
    .string()
    .min(1, "Path is required")
    .max(64, "Path must be 64 characters or less"),
  icon: z.string().nullable().optional(),
});

export function Writer() {
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState<boolean>(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof CartridgeSchema>>({
    resolver: zodResolver(CartridgeSchema),
    defaultValues: {
      name: "",
      pathName: "",
      icon: null,
    },
  });

  const watchedValues = form.watch();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("pathName", file.path || file.name);
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
          form.setValue("icon", resizedDataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: z.infer<typeof CartridgeSchema>) => {
    const cardData: NFCCardData = {
      name: data.name,
      icon: data.icon || null,
      pathName: data.pathName,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter a name for this cartridge..."
                  maxLength={64}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pathName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Path</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="Select an application to launch..."
                    className="flex-1"
                    maxLength={64}
                    {...field}
                  />
                </FormControl>
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>
            Upload Icon (optional - will be resized to 16x16)
          </FormLabel>
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
            {watchedValues.icon && (
              <div className="w-8 h-8 border rounded flex items-center justify-center bg-muted overflow-hidden">
                <img
                  src={watchedValues.icon}
                  alt="Icon preview"
                  className="size-full"
                />
              </div>
            )}
          </div>
        </FormItem>
        <FormItem>
          <FormLabel>Preview</FormLabel>
          <div className="bg-background p-2 rounded-lg grid place-items-center">
            <Preview
              name={watchedValues.name}
              icon={watchedValues.icon}
              pathName={watchedValues.pathName}
            />
          </div>
        </FormItem>
        <Button
          type="submit"
          disabled={
            form.formState.isSubmitting ||
            !form.formState.isValid ||
            !form.formState.isDirty
          }
          className="w-full"
        >
          <Zap className="h-4 w-4 mr-2" />
          Generate Cartridge Data
        </Button>
        {showOutput && (
          <FormItem>
            <FormLabel>Generated JSON Data</FormLabel>
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
                type="button"
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this JSON data and paste it to your NFC card using your
              preferred NFC writing tool.
            </p>
          </FormItem>
        )}
      </form>
    </Form>
  );
}
