import { NextRequest, NextResponse } from "next/server";
import { isAddressAllowlisted, getAllowlistEntry } from "@/lib/allowlist";
import { checkAllowlistStatus } from "@/lib/thirdwebAllowlist";

export async function POST(request: NextRequest) {
  try {
    const { address, tokenId = 0 } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }
    
    // まずThirdwebのClaim Conditionをチェック
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (contractAddress) {
      try {
        const thirdwebStatus = await checkAllowlistStatus(
          contractAddress,
          tokenId,
          address
        );
        
        // Merkle Rootが設定されていない場合（パブリックセール）
        if (!thirdwebStatus.hasMerkleRoot) {
          console.log("No merkle root - public sale, everyone allowed");
          return NextResponse.json({
            address,
            isAllowlisted: true,
            maxMintAmount: thirdwebStatus.maxMintAmount || 100,
            userMinted: thirdwebStatus.userMinted || 0,
            source: "thirdweb-public"
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
            }
          });
        }
        
        // Merkle Rootが設定されている場合
        if (thirdwebStatus.requiresProof) {
          // テスト環境の場合は CSV ベースでチェック
          if ('isTestMode' in thirdwebStatus && thirdwebStatus.isTestMode) {
            console.log("Test mode: checking CSV allowlist for", address);
            
            // CSVアローリストをチェック
            const csvEntry = getAllowlistEntry(address);
            const isInCSV = isAddressAllowlisted(address);
            
            if (isInCSV && csvEntry) {
              console.log("Address found in CSV allowlist");
              return NextResponse.json({
                address,
                isAllowlisted: true,
                maxMintAmount: csvEntry.maxMintAmount || thirdwebStatus.maxMintAmount || 1,
                userMinted: thirdwebStatus.userMinted || 0,
                source: "csv-test-mode"
              }, {
                headers: {
                  'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
                }
              });
            } else {
              console.log("Address NOT found in CSV allowlist");
              return NextResponse.json({
                address,
                isAllowlisted: false,
                maxMintAmount: 0,
                userMinted: thirdwebStatus.userMinted || 0,
                source: "not-in-csv-test-mode"
              }, {
                headers: {
                  'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
                }
              });
            }
          }
          
          // 本番環境の場合（SDK v5 が自動で Merkle Proof を処理）
          console.log("Production mode: SDK v5 will handle Merkle Proof");
          return NextResponse.json({
            address,
            isAllowlisted: true, // SDK v5 が自動処理
            maxMintAmount: thirdwebStatus.maxMintAmount || 1,
            userMinted: thirdwebStatus.userMinted || 0,
            source: "thirdweb-merkle"
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
            }
          });
        }
        
        // Thirdwebの結果を返す
        return NextResponse.json({
          address,
          isAllowlisted: thirdwebStatus.isAllowlisted,
          maxMintAmount: thirdwebStatus.maxMintAmount,
          userMinted: thirdwebStatus.userMinted || 0,
          source: "thirdweb"
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
          }
        });
        
      } catch (thirdwebError) {
        console.error("Error checking Thirdweb allowlist:", thirdwebError);
        // Thirdwebエラーの場合はCSVにフォールバック
      }
    }
    
    // CSVアローリストのみチェック（フォールバック）
    const isAllowlisted = isAddressAllowlisted(address);
    const allowlistEntry = getAllowlistEntry(address);
    
    return NextResponse.json({
      address,
      isAllowlisted,
      maxMintAmount: allowlistEntry?.maxMintAmount || 0,
      userMinted: 0,
      source: "csv"
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error("Error verifying allowlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}