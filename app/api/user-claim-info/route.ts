import { NextResponse } from 'next/server';
import { getContract } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { client } from '@/lib/thirdweb';
import { balanceOf } from 'thirdweb/extensions/erc1155';
import { getActiveClaimCondition } from 'thirdweb/extensions/erc1155';

export async function POST(req: Request) {
  try {
    const { address, tokenId } = await req.json();

    if (!address || tokenId === undefined) {
      return NextResponse.json(
        { error: 'Address and tokenId are required' },
        { status: 400 }
      );
    }

    
    let userMintedCount = 0;
    let hasThirdwebAllowlist = false;
    let isUserAllowlisted = true; // Default to true (public sale)
    let maxClaimablePerWallet = 10;
    let price = '0';
    let currency = 'POL';
    let paymentTokenAddress: string | undefined;
    
    try {
      const contract = getContract({
        client,
        chain: polygon,
        address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      });

      // Get user's current balance
      const balance = await balanceOf({
        contract,
        owner: address,
        tokenId: BigInt(tokenId || 0),
      });
      
      userMintedCount = Number(balance);

      // Get active claim condition from Thirdweb contract
      try {
        const claimCondition = await getActiveClaimCondition({
          contract,
          tokenId: BigInt(tokenId || 0),
        });
        
        if (claimCondition) {
          // Check if there's a merkle root (allowlist)
          hasThirdwebAllowlist = claimCondition.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';
          maxClaimablePerWallet = Number(claimCondition.quantityLimitPerWallet || 10n);
          
          // Get currency info and calculate price based on decimals
          if (claimCondition.currency === '0x0000000000000000000000000000000000000000' || 
              claimCondition.currency === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
            currency = 'MATIC';
            paymentTokenAddress = undefined; // Native token
            // MATIC has 18 decimals
            price = claimCondition.pricePerToken ? (Number(claimCondition.pricePerToken) / 1e18).toString() : '0';
          } else if (claimCondition.currency === '0x7B2d2732dcCC1830AA63241dC13649b7861d9b54') {
            currency = 'ZENY';
            paymentTokenAddress = '0x7B2d2732dcCC1830AA63241dC13649b7861d9b54';
            // ZENY has 0 decimals (integer) but stored as Wei (18 decimals) in contract
            price = claimCondition.pricePerToken ? (Number(claimCondition.pricePerToken) / 1e18).toString() : '0';
          } else if (claimCondition.currency === '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174') {
            currency = 'USDC';
            paymentTokenAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
            // USDC has 6 decimals
            price = claimCondition.pricePerToken ? (Number(claimCondition.pricePerToken) / 1e6).toString() : '0';
          } else {
            // Unknown token, assume 18 decimals
            currency = 'TOKEN';
            paymentTokenAddress = claimCondition.currency;
            price = claimCondition.pricePerToken ? (Number(claimCondition.pricePerToken) / 1e18).toString() : '0';
          }

          // If there's an allowlist, for now we'll assume the user is not on it
          // (proper verification would require merkle proof)
          if (hasThirdwebAllowlist) {
            isUserAllowlisted = false; // Would need merkle proof to verify
          }
        }
      } catch (error) {
        console.error('No active claim condition or error reading it for tokenId', tokenId, ':', error);
      }
    } catch (error) {
      console.error('Error getting contract data:', error);
    }

    // Create user claim info based on Thirdweb data
    const claimInfo = {
      address,
      isAllowlisted: isUserAllowlisted,
      maxMintAmount: isUserAllowlisted ? Math.max(0, maxClaimablePerWallet - userMintedCount) : 0,
      currentPrice: price,
      currency,
      paymentTokenAddress,
      availableSupply: 1000, // Would need to check actual supply
      userMinted: userMintedCount,
      canMint: isUserAllowlisted && userMintedCount < maxClaimablePerWallet,
      saleActive: true,
      reason: !isUserAllowlisted ? 'Not on allowlist' : 
              (userMintedCount >= maxClaimablePerWallet ? 'Max mint amount reached' : undefined),
    };

    return NextResponse.json(claimInfo);
  } catch (error) {
    console.error('Error in user-claim-info API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}