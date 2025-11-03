import fs from "fs";
import path from "path";
import crypto from "crypto";

export type DecodedBase64 = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

export function decodeBase64Image(input: string): DecodedBase64 {
  // Suporta data URL (ex: data:image/png;base64,XXXX)
  const dataUrlMatch = input.match(/^data:(.+);base64,(.*)$/);
  let mimeType = "application/octet-stream";
  let base64Payload = input;
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64Payload = dataUrlMatch[2];
  }
  const buffer = Buffer.from(base64Payload, "base64");
  const extension = mimeTypeToExtension(mimeType);
  return { buffer, mimeType, extension };
}

export function mimeTypeToExtension(mimeType: string): string {
  const mapping: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return mapping[mimeType] || "bin";
}

export function extensionToMimeType(extension: string): string {
  const normalized = extension.replace(/^\./, "").toLowerCase();
  const mapping: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    heic: "image/heic",
    heif: "image/heif",
  };
  return mapping[normalized] || "application/octet-stream";
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function writeFileIfNotExists(filePath: string, content: Buffer): void {
  if (!fileExists(filePath)) {
    fs.writeFileSync(filePath, content);
  }
}

export function readFileAsBase64(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

export function readFileAsDataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath);
  const mime = extensionToMimeType(ext);
  const base64 = buf.toString("base64");
  return `data:${mime};base64,${base64}`;
}

export function buildResourceFilePath(baseDir: string, hash: string, extension: string): string {
  const fileName = `${hash}.${extension}`;
  return path.join(baseDir, fileName);
}


