import type { NextRequest } from "next/server";
import { downloadExperienceQuote } from "@/lib/experience-quote-download";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return downloadExperienceQuote(request, (await params).id, true);
}
