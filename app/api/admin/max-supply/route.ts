import { NextResponse } from 'next/server';
import { getMaxSupplyConfig } from '@/lib/maxSupplyManager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    const config = getMaxSupplyConfig(parseInt(tokenId));

    return NextResponse.json({
      success: true,
      config: config
    });
  } catch (error) {
    console.error('Error getting max supply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}