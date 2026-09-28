import { ACTIONS_CORS_HEADERS, type ActionsJson } from "@solana/actions";
import { NextResponse } from "next/server";

export function GET() {
  const body: ActionsJson = {
    rules: [{ pathPattern: "/p/*", apiPath: "/api/actions/subscribe/*" }],
  };
  return NextResponse.json(body, { headers: ACTIONS_CORS_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
}
