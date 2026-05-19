import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/data/catalog';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'it';

  try {
    const products = await getProducts(locale);
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
