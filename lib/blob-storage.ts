import "server-only";
import { put, get } from "@vercel/blob";
import { createHash } from "node:crypto";

/**
 * Coms Dashboard Blob Storage (specs 007/008).
 *
 * Separate source objects for WhatsApp and email, no list() in render path.
 * Paths:
 *   dashboard/v1/whatsapp/latest.json
 *   dashboard/v1/email/latest.json
 *
 * BLOB_READ_WRITE_TOKEN must be set in the server environment.
 */

const EMAIL_SOURCE_PATH = "dashboard/v1/email/latest.json";
const WHATSAPP_SOURCE_PATH = "dashboard/v1/whatsapp/latest.json";

export { EMAIL_SOURCE_PATH as EMAIL_SOURCE_PATH_CONSTANT, EMAIL_SOURCE_PATH };

export interface BlobStorageClient {
  readBlobText(path: string): Promise<string | null>;
  writeBlob(path: string, content: string): Promise<{ written: boolean; hash: string }>;
  computeHash(content: string): string;
}

export class VercelBlobStorageClient implements BlobStorageClient {
  private readonly token: string | undefined;

  constructor(token: string | undefined = process.env.BLOB_READ_WRITE_TOKEN) {
    this.token = token;
  }

  async readBlobText(path: string): Promise<string | null> {
    try {
      const result = await get(path, {
        access: "private",
        token: this.token,
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return new Response(result.stream).text();
    } catch {
      return null;
    }
  }

  async writeBlob(
    path: string,
    content: string
  ): Promise<{ written: boolean; hash: string }> {
    const hash = this.computeHash(content);
    await put(path, content, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: this.token,
    });
    return { written: true, hash };
  }

  computeHash(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
  }
}
