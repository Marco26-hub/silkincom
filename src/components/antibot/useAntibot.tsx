'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Client half of the anti-bot layer (see src/lib/antibot.ts).
 *
 * On mount it fetches a signed timing token. Spread `fields()` into the JSON
 * body of your POST, and render `<Honeypot />` inside the form. Humans leave
 * the honeypot empty and take >2s to submit, so their requests pass; bots that
 * fill the hidden field or replay the API without a token are rejected.
 */
export function useAntibot() {
  const [token, setToken] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/antibot/token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.token) setToken(d.token);
      })
      .catch((err) => {
        // Not silent: surface it. Token stays empty ⇒ the server will reject
        // the submit with "ricarica la pagina", so we log why that happened.
        console.error('[antibot] token fetch failed', err);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Merge into the request body: { ...payload, ...fields() }
  function fields(): Record<string, string> {
    return {
      antibot_token: token,
      website: honeypotRef.current?.value ?? '',
    };
  }

  // Hidden honeypot input — off-screen, not tabbable, not announced.
  function Honeypot() {
    return (
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
          opacity: 0,
        }}
      />
    );
  }

  return { token, fields, Honeypot };
}
