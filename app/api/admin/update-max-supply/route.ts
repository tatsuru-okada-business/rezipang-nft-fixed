import { NextResponse } from 'next/server';
import { setMaxSupply, getMaxSupplyConfig } from '@/lib/maxSupplyManager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenId, maxSupply, reservedSupply } = body;

    if (tokenId === undefined || tokenId === null) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // maxSupplyがnullまたはundefinedの場合は無制限に設定
    const supply = maxSupply === null || maxSupply === undefined || maxSupply === '' 
      ? undefined 
      : parseInt(maxSupply);
    
    const reserved = reservedSupply ? parseInt(reservedSupply) : 0;

    // 設定を更新
    const success = setMaxSupply(tokenId, supply, reserved);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update max supply' },
        { status: 500 }
      );
    }

    // 更新後の設定を取得
    const updatedConfig = getMaxSupplyConfig(tokenId);

    return NextResponse.json({
      success: true,
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating max supply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

