import { zodResolver } from "@hookform/resolvers/zod";
import { FolderIcon, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Preview } from "@/components/preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useLogsContext } from "@/contexts/logs-context";
import { useCartridge } from "@/hooks/cartridge.hook";
import { NFCCardData } from "@/types/electron";

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
});

export function Writer() {
  const { lastCartridge, sendCommand } = useCartridge();
  const { addLogs } = useLogsContext();
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof CartridgeSchema>>({
    resolver: zodResolver(CartridgeSchema),
    defaultValues: {
      name: "",
      pathName: "",
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    checkSize();
  }, [watchedValues.name, watchedValues.pathName]);

  const calculateBase64Size = (data: NFCCardData): number => {
    const jsonString = JSON.stringify(data);
    const base64String = btoa(jsonString);
    return new Blob([base64String]).size;
  };

  const checkSize = () => {
    const currentData: NFCCardData = {
      name: watchedValues.name || "",
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

  const onSubmit = async (data: z.infer<typeof CartridgeSchema>) => {
    const cardData: NFCCardData = {
      name: data.name,
      pathName: data.pathName,
    };

    const base64Size = calculateBase64Size(cardData);

    if (base64Size > NFC215_MAX_BYTES) {
      return;
    }

    const base64String = btoa(JSON.stringify(cardData));

    try {
      await sendCommand(`WRITE_DATA:${base64String}`);
      toast.success("Cartridge written successfully!");
      addLogs(`Cartridge written: ${JSON.stringify(cardData)}`);
    } catch (error) {
      toast.error("Failed to write cartridge.");
      addLogs(`Error writing cartridge: ${error}`);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const filePath = file.path || file.name;
      form.setValue("pathName", filePath, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
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
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderIcon className="size-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Preview</FormLabel>
          <Preview
            name={watchedValues.name}
            pathName={watchedValues.pathName}
          />
        </FormItem>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={
              form.formState.isSubmitting ||
              !form.formState.isValid ||
              !form.formState.isDirty ||
              lastCartridge === null
            }
          >
            <Zap className="size-4" />
            {sizeWarning?.includes("exceeds")
              ? "Data Too Large"
              : "Write to Cartridge"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              form.reset();
              form.clearErrors();

              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            Reset Form
          </Button>
        </div>
      </form>
    </Form>
  );
}
