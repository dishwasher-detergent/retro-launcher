import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Download, Zap } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Preview } from "@/components/preview";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NFCCardData } from "@/types/electron";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

// NFC215 has approximately 504 bytes of user data storage
const NFC215_MAX_BYTES = 480; // Leave some buffer for safety
const MAX_NAME_LENGTH = 32; // Reduced from 64
const MAX_PATH_LENGTH = 100; // Reduced from 64

const CartridgeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or less`),
  pathName: z
    .string()
    .min(1, "Path is required")
    .max(MAX_PATH_LENGTH, `Path must be ${MAX_PATH_LENGTH} characters or less`),
  icon: z.string().nullable().optional(),
});

export function Writer() {
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [base64Output, setBase64Output] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState<boolean>(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
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

  // Calculate the size of the JSON in bytes
  const calculateJsonSize = (data: NFCCardData): number => {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  };

  // Calculate the size of the base64 encoded JSON in bytes
  const calculateBase64Size = (data: NFCCardData): number => {
    const jsonString = JSON.stringify(data);
    const base64String = btoa(jsonString);
    return new Blob([base64String]).size;
  };

  // Check if current data would fit on NFC215
  const checkSize = () => {
    const currentData: NFCCardData = {
      name: watchedValues.name || "",
      icon: watchedValues.icon || null,
      pathName: watchedValues.pathName || "",
    };

    const base64Size = calculateBase64Size(currentData);

    if (base64Size > NFC215_MAX_BYTES) {
      setSizeWarning(
        `Base64 data size: ${base64Size} bytes (exceeds NFC215 limit of ${NFC215_MAX_BYTES} bytes)`
      );
      return false;
    } else {
      setSizeWarning(
        `Base64 data size: ${base64Size} bytes (${
          NFC215_MAX_BYTES - base64Size
        } bytes remaining)`
      );
      return true;
    }
  };

  // Check size whenever form values change
  useEffect(() => {
    checkSize();
  }, [watchedValues.name, watchedValues.pathName, watchedValues.icon]);

  const resizeAndCompressIcon = (img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 16;
    canvas.height = 16;

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, 16, 16);

      let quality = 0.7;
      let dataUrl = "";

      do {
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        quality -= 0.1;
      } while (dataUrl.length > 200 && quality > 0.1);

      if (dataUrl.length > 200) {
        canvas.width = 12;
        canvas.height = 12;
        ctx.drawImage(img, 0, 0, 12, 12);
        dataUrl = canvas.toDataURL("image/png");
      }

      if (dataUrl.length > 200) {
        canvas.width = 8;
        canvas.height = 8;
        ctx.drawImage(img, 0, 0, 8, 8);
        dataUrl = canvas.toDataURL("image/png");
      }

      if (dataUrl.length > 200) {
        return null;
      }

      return dataUrl;
    }

    return null;
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const filePath = file.path || file.name;
      form.setValue("pathName", filePath);

      if (!form.getValues("name")) {
        const fileName =
          filePath
            .split("\\")
            .pop()
            ?.split("/")
            .pop()
            ?.replace(/\.(exe|lnk|bat|cmd)$/i, "") || "";

        if (fileName) {
          form.setValue("name", fileName);
        }
      }

      if (
        (filePath.endsWith(".exe") || filePath.endsWith(".lnk")) &&
        !form.getValues("icon") &&
        window.electronAPI
      ) {
        try {
          const result = await window.electronAPI.extractExeIcon(filePath);
          if (result.success && result.icon) {
            const img = new Image();
            img.onload = () => {
              const resizedDataUrl = resizeAndCompressIcon(img);

              if (resizedDataUrl) {
                form.setValue("icon", resizedDataUrl);
                form.clearErrors("icon"); // Clear any previous errors
              } else {
                form.setError("icon", {
                  type: "custom",
                  message: "Icon is too large to fit on NFC215 card.",
                });
              }
            };
            img.src = result.icon;
          }
        } catch (error) {
          console.error("Failed to extract icon from executable:", error);
        }
      }
    }
  };

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const resizedDataUrl = resizeAndCompressIcon(img);
        if (resizedDataUrl) {
          form.setValue("icon", resizedDataUrl);
          form.clearErrors("icon"); // Clear any previous errors
        } else {
          form.setError("icon", {
            type: "manual",
            message: "Icon is too large to fit on NFC215 card.",
          });
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

    // Check size before generating output
    const base64Size = calculateBase64Size(cardData);

    if (base64Size > NFC215_MAX_BYTES) {
      return;
    }

    const jsonString = JSON.stringify(cardData, null, 2);
    const base64String = btoa(JSON.stringify(cardData));

    setJsonOutput(jsonString);
    setBase64Output(base64String);
    setShowOutput(true);
  };

  const copyToClipboard = async () => {
    if (!jsonOutput) {
      return;
    }

    try {
      await navigator.clipboard.writeText(jsonOutput);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const copyBase64ToClipboard = async () => {
    if (!base64Output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(base64Output);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Alert
          variant={sizeWarning?.includes("exceeds") ? "destructive" : "default"}
        >
          <AlertTitle>Storage</AlertTitle>
          <AlertDescription>
            {sizeWarning || "Calculating..."}
            <br />
            NFC215 cards have ~480 bytes of storage. Large icons or long paths
            may exceed this limit.
          </AlertDescription>
        </Alert>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter a name for this cartridge..."
                  maxLength={MAX_NAME_LENGTH}
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
                    maxLength={MAX_PATH_LENGTH}
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
        <FormField
          control={form.control}
          name="icon"
          render={() => (
            <FormItem>
              <FormLabel>
                Icon (optional - auto-extracted from exe or upload custom)
              </FormLabel>
              <div className="flex gap-2 items-center">
                <FormControl>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => iconInputRef.current?.click()}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {watchedValues.icon ? "Replace Icon" : "Choose Image"}
                </Button>
                {watchedValues.icon && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 border rounded flex items-center justify-center bg-muted overflow-hidden">
                      <img
                        src={watchedValues.icon}
                        alt="Icon preview"
                        className="size-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.setValue("icon", null);
                        form.clearErrors("icon");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              <FormDescription>
                Icons are automatically extracted from .exe files. You can
                upload a custom image to override the auto-extracted icon.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Preview</FormLabel>
          <Preview
            name={watchedValues.name}
            icon={watchedValues.icon}
            pathName={watchedValues.pathName}
          />
        </FormItem>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={
              form.formState.isSubmitting ||
              !form.formState.isValid ||
              !form.formState.isDirty
            }
          >
            <Zap className="h-4 w-4 mr-2" />
            {sizeWarning?.includes("exceeds")
              ? "Data Too Large for NFC215"
              : "Generate Cartridge Data"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              form.clearErrors();
              setJsonOutput(null);
              setBase64Output(null);
              setShowOutput(false);

              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
              if (iconInputRef.current) {
                iconInputRef.current.value = "";
              }
            }}
          >
            Reset Form
          </Button>
        </div>
        {showOutput && (
          <>
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
                Human-readable JSON format for debugging and manual use.
              </p>
            </FormItem>
            <FormItem>
              <FormLabel>Generated Base64 Data</FormLabel>
              <div className="relative">
                <textarea
                  value={base64Output || ""}
                  readOnly
                  className="bg-background w-full h-32 p-3 text-sm font-mono border rounded-md resize-none"
                  placeholder="Generated Base64 will appear here..."
                />
                <Button
                  onClick={copyBase64ToClipboard}
                  size="icon"
                  className="absolute top-2 right-2"
                  type="button"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Base64 encoded data optimized for NFC card storage. Copy this
                data and paste it to your NFC card using your preferred NFC
                writing tool.
              </p>
            </FormItem>
          </>
        )}
      </form>
    </Form>
  );
}
