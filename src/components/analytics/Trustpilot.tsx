'use client';

import Script from 'next/script';

const BUSINESS_UNIT_ID = process.env.NEXT_PUBLIC_TRUSTPILOT_BUSINESSUNIT_ID;

export function Trustpilot() {
  if (!BUSINESS_UNIT_ID) return null;

  return (
    <Script
      src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
      strategy="afterInteractive"
    />
  );
}
