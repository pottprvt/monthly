import { NextResponse } from "next/server";

import { listProviders } from "@/integrations/registry";

/** Providers and whether they are set up on this deployment. */
export function GET() {
  return NextResponse.json(listProviders(), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
