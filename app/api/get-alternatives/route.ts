import { NextRequest, NextResponse } from "next/server";
import { getAlternatives } from "@/lib/fetchers";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  try {
    const data = await getAlternatives(name);
    return NextResponse.json(data);
  } catch (_e) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}


