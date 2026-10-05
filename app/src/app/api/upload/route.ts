import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { clientIp, sameOrigin } from "@/server/auth/request";
import { allow, storeConfigured } from "@/server/store";

const MAX_BYTES = 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Stores a plan image in Vercel Blob and returns its public https URL for the on-chain plan. */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image upload is not configured yet" }, { status: 503 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (storeConfigured() && !(await allow(`upload:ip:${clientIp(req)}`, 10, 3600))) {
    return NextResponse.json({ error: "Upload limit reached, try again later" }, { status: 429 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use PNG, JPG, WebP or GIF" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Max. 1 MB" }, { status: 400 });

  const blob = await put(`plans/image.${ext}`, file, { access: "public", addRandomSuffix: true });
  return NextResponse.json({ url: blob.url });
}
