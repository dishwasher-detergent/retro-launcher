import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeNdefTextRecord(blockData: Record<string, string>) {
  const blocks = Object.values(blockData);
  const bytes = blocks
    .join(" ")
    .split(" ")
    .filter((h) => h.length > 0)
    .map((h) => parseInt(h, 16));

  let i = 0;

  // Find NDEF TLV (0x03)
  while (i < bytes.length && bytes[i] !== 0x03) i++;
  if (i >= bytes.length) {
    console.error("NDEF TLV not found");
    return;
  }

  i += 2;

  const typeLength = bytes[i + 1];
  const payloadLength = bytes[i + 2];
  const type = bytes.slice(i + 3, i + 3 + typeLength);
  const payloadStart = i + 3 + typeLength;
  const payload = bytes.slice(payloadStart, payloadStart + payloadLength);

  // Check type
  if (type[0] !== 0x54) {
    throw new Error("Not a text record");
  }

  const status = payload[0];
  const langLength = status & 0x3f;
  const textBytes = payload.slice(1 + langLength);

  const text = new TextDecoder("utf-8").decode(Uint8Array.from(textBytes));
  return text;
}
