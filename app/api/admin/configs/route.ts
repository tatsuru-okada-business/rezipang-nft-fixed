import { NextResponse } from 'next/server';
import { getSaleConfigs, saveSaleConfigs } from '@/lib/saleConfig';
import type { SaleConfig } from '@/lib/types/saleConfig';

const ADMIN_ADDRESSES = (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || '').split(',').map(addr => addr.toLowerCase().trim());

export async function GET(req: Request) {
  try {
    const configs = getSaleConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { configs } = await req.json();
    
    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json(
        { error: 'Invalid configuration data' },
        { status: 400 }
      );
    }

    const processedConfigs: SaleConfig[] = configs.map(config => ({
      ...config,
      createdAt: new Date(config.createdAt || Date.now()),
      updatedAt: new Date(),
      conditions: config.conditions.map((condition: any) => ({
        ...condition,
        startTime: new Date(condition.startTime),
        endTime: condition.endTime ? new Date(condition.endTime) : undefined,
      })),
    }));

    saveSaleConfigs(processedConfigs);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving configs:', error);
    return NextResponse.json(
      { error: 'Failed to save configurations' },
      { status: 500 }
    );
  }
}