import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'La Nostra Storia — Eleganza e Artigianato di Como',
  description:
    'SILKinCOM nasce dal cuore del distretto serico di Como. Una tradizione tessile secolare reinterpretata con design contemporaneo.',
};

export default function StoriaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
