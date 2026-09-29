import { NextResponse } from "next/server";

import { sessionWallet } from "@/server/auth/request";

export async function GET() {
  return NextResponse.json({ wallet: await sessionWallet() }, { headers: { "Cache-Control": "no-store" } });
}
