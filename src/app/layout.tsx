// Root layout — Next.js requires a root layout at app/layout.tsx.
// The real <html>/<body> markup lives in app/[locale]/layout.tsx so the
// document language can be set per locale. This root layout is a minimal
// pass-through that simply renders its children.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
