'use client';

import { useState, useEffect } from 'react';
import { getContract } from 'thirdweb';
import { readContract } from 'thirdweb/extensions/erc20';
import type { Address } from 'thirdweb';

interface ApprovalManagerProps {
  paymentTokenAddress: string;
  spenderAddress: string;
  userAddress: string;
  requiredAmount: bigint;
  client: any;
  chain: any;
}

interface ApprovalStatus {
  hasApproval: boolean;
  currentAllowance: bigint;
  needsApproval: boolean;
  approvalAmount: bigint;
}

export function useApprovalManager({
  paymentTokenAddress,
  spenderAddress,
  userAddress,
  requiredAmount,
  client,
  chain,
}: ApprovalManagerProps): ApprovalStatus {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>({
    hasApproval: false,
    currentAllowance: 0n,
    needsApproval: true,
    approvalAmount: requiredAmount,
  });

  useEffect(() => {
    async function checkAllowance() {
      if (!paymentTokenAddress || !spenderAddress || !userAddress) return;

      try {
        const paymentToken = getContract({
          client,
          chain,
          address: paymentTokenAddress as Address,
        });

        // 現在の承認額を確認
        const allowance = await readContract({
          contract: paymentToken,
          method: "function allowance(address owner, address spender) view returns (uint256)",
          params: [userAddress as Address, spenderAddress as Address],
        });

        const currentAllowance = BigInt(allowance.toString());
        const needsApproval = currentAllowance < requiredAmount;

        // 承認が必要な場合、既存の承認額との差分のみを承認
        const approvalAmount = needsApproval 
          ? requiredAmount - currentAllowance 
          : 0n;

        setApprovalStatus({
          hasApproval: !needsApproval,
          currentAllowance,
          needsApproval,
          approvalAmount: approvalAmount > 0n ? approvalAmount : 0n,
        });
      } catch (error) {
        console.error('Error checking allowance:', error);
      }
    }

    checkAllowance();
  }, [paymentTokenAddress, spenderAddress, userAddress, requiredAmount, client, chain]);

  return approvalStatus;
}

// 承認戦略の選択肢
export enum ApprovalStrategy {
  EXACT_AMOUNT = 'exact',        // 必要な分だけ承認（デフォルト）
  BATCH_AMOUNT = 'batch',        // 複数回分まとめて承認
  MAX_APPROVAL = 'max',          // 無制限承認（非推奨）
}

export function calculateApprovalAmount(
  requiredAmount: bigint,
  strategy: ApprovalStrategy = ApprovalStrategy.EXACT_AMOUNT,
  batchSize: number = 5
): bigint {
  switch (strategy) {
    case ApprovalStrategy.EXACT_AMOUNT:
      return requiredAmount;
    
    case ApprovalStrategy.BATCH_AMOUNT:
      // 5回分など、まとめて承認
      return requiredAmount * BigInt(batchSize);
    
    case ApprovalStrategy.MAX_APPROVAL:
      // 最大値承認（OpenSeaで大きな金額として表示される）
      return BigInt(2) ** BigInt(256) - BigInt(1);
    
    default:
      return requiredAmount;
  }
}

// OpenSeaでの表示を最適化するためのヘルパー
export function formatApprovalForDisplay(
  amount: bigint,
  decimals: number = 0,
  tokenSymbol: string = 'ZENY'
): string {
  if (amount === BigInt(2) ** BigInt(256) - BigInt(1)) {
    return `Unlimited ${tokenSymbol}`;
  }
  
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  
  return `${whole.toString()} ${tokenSymbol}`;
}