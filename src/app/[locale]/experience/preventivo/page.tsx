import type { Metadata } from "next";
import { SharedExperienceQuote } from "./shared-quote";

export const metadata: Metadata = {
  title: "Preventivo Experience",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return <SharedExperienceQuote />;
}
