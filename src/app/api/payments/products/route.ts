import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/server/catalog";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const products = await listCatalogProducts({ q: q.length ? q : undefined });

  return NextResponse.json({
    products,
  });
}
