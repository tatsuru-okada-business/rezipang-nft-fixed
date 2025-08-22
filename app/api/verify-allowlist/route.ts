import { NextRequest, NextResponse } from "next/server";
import { isAddressAllowlisted, getAllowlistEntry } from "@/lib/allowlist";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }
    
    const isAllowlisted = isAddressAllowlisted(address);
    const allowlistEntry = getAllowlistEntry(address);
    
    return NextResponse.json({
      address,
      isAllowlisted,
      maxMintAmount: allowlistEntry?.maxMintAmount || 0
    });
  } catch (error) {
    console.error("Error verifying allowlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}