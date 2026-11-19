import type { NextRequest } from "next/server";
import { handleSupplierQuote } from "@/lib/experience-supplier-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleSupplierQuote(request);
}
