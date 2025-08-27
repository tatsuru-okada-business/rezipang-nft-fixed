import { NextResponse } from 'next/server';
import { updateMintedCount } from '@/lib/maxSupplyManager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenId, quantity } = body;

    if (tokenId === undefined || tokenId === null) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    const qty = quantity || 1;
    const success = updateMintedCount(tokenId, qty);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update minted count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating minted count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}