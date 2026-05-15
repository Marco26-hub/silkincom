import { NextRequest, NextResponse } from 'next/server';

export function requireAutomationKey(req: NextRequest) {
  const expected = process.env.AUTOMATION_API_KEY || process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'Automation endpoint disabled: AUTOMATION_API_KEY not configured' },
      { status: 503 }
    );
  }

  const provided = req.headers.get('x-automation-key');
  const auth = req.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (provided === expected || bearer === expected) return null;

  return NextResponse.json(
    { error: 'Unauthorized automation request' },
    { status: 401 }
  );
}
