import { getContract, readContract } from "thirdweb";
import { client, chain } from "./thirdweb";
import { keccak256, encodePacked } from "viem";

/**
 * Thirdweb Claim ConditionのMerkle Rootベースアローリストチェック
 */

interface ClaimCondition {
  merkleRoot: string;
  maxClaimableSupply: bigint;
  quantityLimitPerWallet: bigint;
  pricePerToken: bigint;
  currency: string;
}

/**
 * コントラクトのClaim Conditionを取得
 */
export async function getClaimCondition(
  contractAddress: string,
  tokenId: number
): Promise<ClaimCondition | null> {
  try {
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // まずトークンが存在するか確認
    try {
      // SDK v5の方法でクレーム条件を取得を試みる
      const claimCondition = await readContract({
        contract,
        method: "function claimCondition(uint256) view returns (uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)",
        params: [BigInt(tokenId)],
      });

      if (!claimCondition) return null;

      return {
        merkleRoot: claimCondition[4] as string,
        maxClaimableSupply: BigInt(claimCondition[1].toString()),
        quantityLimitPerWallet: BigInt(claimCondition[3].toString()),
        pricePerToken: BigInt(claimCondition[5].toString()),
        currency: claimCondition[6] as string,
      };
    } catch (innerError: any) {
      // PositionOutOfBoundsErrorの場合は、クレーム条件が設定されていない
      if (innerError?.shortMessage?.includes('Position') && innerError?.shortMessage?.includes('out of bounds')) {
        // これは正常な状態なので、debugレベルでのみログ出力
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Token ${tokenId} has no claim condition set (this is normal for tokens without conditions)`);
        }
        return null;
      }
      // その他のエラーは再スロー
      throw innerError;
    }
  } catch (error: any) {
    // エラーログを改善
    if (error?.shortMessage?.includes('Position') && error?.shortMessage?.includes('out of bounds')) {
      // これは正常な状態（クレーム条件が設定されていない）
      return null;
    }
    // エラーが予期されるものでない場合のみログ出力
    console.warn("Warning getting claim condition:", error?.shortMessage || error?.message || "Unknown error");
    return null;
  }
}

/**
 * Merkle Rootが設定されているかチェック
 */
export async function hasMerkleRoot(
  contractAddress: string,
  tokenId: number
): Promise<boolean> {
  const condition = await getClaimCondition(contractAddress, tokenId);
  if (!condition) return false;
  
  // 0x0...0 はMerkle Rootが設定されていない
  return condition.merkleRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000";
}

/**
 * ユーザーがすでにクレームした数を取得
 */
export async function getUserClaimedAmount(
  contractAddress: string,
  tokenId: number,
  userAddress: string
): Promise<number> {
  try {
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // getSupplyClaimedByWallet メソッドを試す
    try {
      const claimed = await readContract({
        contract,
        method: "function getSupplyClaimedByWallet(uint256 tokenId, address wallet) view returns (uint256)",
        params: [BigInt(tokenId), userAddress],
      });
      return Number(claimed.toString());
    } catch (e) {
      // 別のメソッド名を試す
      try {
        const claimed = await readContract({
          contract,
          method: "function claimedByWallet(uint256 tokenId, address wallet) view returns (uint256)",
          params: [BigInt(tokenId), userAddress],
        });
        return Number(claimed.toString());
      } catch (e2) {
        console.log("Could not get user claimed amount, defaulting to 0");
        return 0;
      }
    }
  } catch (error) {
    console.error("Error getting user claimed amount:", error);
    return 0;
  }
}

/**
 * アローリストステータスを確認（統合版）
 */
export async function checkAllowlistStatus(
  contractAddress: string,
  tokenId: number,
  userAddress: string
): Promise<{
  isAllowlisted: boolean;
  maxMintAmount: number;
  userMinted: number;
  hasMerkleRoot: boolean;
  requiresProof: boolean;
  isTestMode?: boolean;
}> {
  try {
    // Claim Conditionを取得
    const condition = await getClaimCondition(contractAddress, tokenId);
    
    if (!condition) {
      // Claim Conditionがない場合はアローリストなし（誰でもミント可能）
      return {
        isAllowlisted: true,
        maxMintAmount: 100,
        userMinted: 0,
        hasMerkleRoot: false,
        requiresProof: false,
      };
    }

    // Merkle Rootが設定されているか確認
    const merkleRootExists = condition.merkleRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    // ユーザーがすでにミントした数を取得
    const userMinted = await getUserClaimedAmount(contractAddress, tokenId, userAddress);
    
    // 最大ミント数（コントラクトの制限）
    const maxFromContract = Number(condition.quantityLimitPerWallet.toString());
    
    if (!merkleRootExists) {
      // Merkle Rootがない場合は、誰でもミント可能（パブリックセール）
      console.log("No merkle root, public sale");
      return {
        isAllowlisted: true,
        maxMintAmount: maxFromContract - userMinted,
        userMinted,
        hasMerkleRoot: false,
        requiresProof: false,
      };
    }

    // Merkle Rootがある場合
    console.log("Merkle root exists");
    
    // テスト環境の場合は特別処理（CSV ベースでチェック）
    // 環境変数で判定する方が良い
    const isTestEnvironment = 
      process.env.NEXT_PUBLIC_USE_CSV_FOR_MERKLE === "true" ||
      contractAddress.toLowerCase() === "0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1".toLowerCase();
    
    if (isTestEnvironment) {
      console.log("Test environment detected - will check CSV allowlist");
      // テスト環境では CSV ベースのチェックを API 側で行う
      return {
        isAllowlisted: false, // API側でCSVチェックさせるために一旦false
        maxMintAmount: maxFromContract - userMinted,
        userMinted,
        hasMerkleRoot: true,
        requiresProof: true,
        isTestMode: true, // テストモードフラグを追加
      };
    }
    
    // 本番環境の場合は Thirdweb の Merkle 検証に任せる
    // SDK v5 が自動的に Merkle Proof を取得・検証する
    return {
      isAllowlisted: true, // SDK v5 が自動処理
      maxMintAmount: maxFromContract - userMinted,
      userMinted,
      hasMerkleRoot: true,
      requiresProof: true,
    };
    
  } catch (error) {
    console.error("Error checking allowlist status:", error);
    // エラーの場合はデフォルト値を返す
    return {
      isAllowlisted: true, // エラー時は一旦trueにして、実際のミント時にエラーを出す
      maxMintAmount: 1,
      userMinted: 0,
      hasMerkleRoot: false,
      requiresProof: false,
    };
  }
}