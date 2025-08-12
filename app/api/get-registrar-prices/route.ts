import { NextRequest, NextResponse } from "next/server";
import { getRegistrarPrices } from "@/lib/fetchers";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const tld = req.nextUrl.searchParams.get("tld");
  const name = req.nextUrl.searchParams.get("name");
  if (!tld) return NextResponse.json({ error: "Missing tld" }, { status: 400 });
  try {
    const data = await getRegistrarPrices(tld, name || undefined);
    return NextResponse.json(data);
  } catch (_e) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}


