import { keccak256, encodePacked, getAddress } from 'viem';
import { MerkleTree } from 'merkletreejs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Merkle Proof管理システム
 * アローリストからMerkle Treeを生成し、Proofを自動生成
 */

interface MerkleData {
  root: string;
  tree: any;
  addresses: string[];
  proofs: Map<string, string[]>;
  lastUpdated: Date;
}

// キャッシュ
const merkleCache = new Map<number, MerkleData>();

/**
 * アドレスをハッシュ化（Thirdweb互換）
 */
function hashAddress(address: string): Buffer {
  // Thirdwebの方式に合わせてハッシュ化
  const normalized = getAddress(address); // チェックサム付きアドレスに正規化
  return Buffer.from(keccak256(encodePacked(['address'], [normalized as `0x${string}`])).slice(2), 'hex');
}

/**
 * CSVからアローリストを読み込み
 */
function loadAllowlistFromCSV(): string[] {
  const csvPath = join(process.cwd(), 'allowlist.csv');
  
  if (!existsSync(csvPath)) {
    console.log('No allowlist.csv found');
    return [];
  }
  
  try {
    const content = readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // ヘッダーをスキップ
    const addresses = lines.slice(1).map(line => {
      const [address] = line.split(',');
      return address?.trim();
    }).filter(addr => addr && addr.startsWith('0x'));
    
    console.log(`Loaded ${addresses.length} addresses from CSV`);
    return addresses;
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
}

/**
 * Merkle Treeを生成
 */
export function generateMerkleTree(addresses: string[]): MerkleData {
  // アドレスをハッシュ化
  const leaves = addresses.map(addr => hashAddress(addr));
  
  // Merkle Tree生成
  const tree = new MerkleTree(leaves, keccak256, { 
    sortPairs: true,
    hashLeaves: false // 既にハッシュ化済み
  });
  
  const root = '0x' + tree.getRoot().toString('hex');
  
  // 各アドレスのProofを生成
  const proofs = new Map<string, string[]>();
  addresses.forEach(address => {
    const leaf = hashAddress(address);
    const proof = tree.getProof(leaf);
    const hexProof = proof.map(p => '0x' + p.data.toString('hex'));
    proofs.set(address.toLowerCase(), hexProof);
  });
  
  return {
    root,
    tree,
    addresses,
    proofs,
    lastUpdated: new Date()
  };
}

/**
 * Merkle Proofを取得（キャッシュ付き）
 */
export function getMerkleProof(address: string, tokenId: number = 0): string[] {
  // キャッシュチェック
  let merkleData = merkleCache.get(tokenId);
  
  if (!merkleData) {
    // CSVから生成
    const addresses = loadAllowlistFromCSV();
    if (addresses.length === 0) {
      return [];
    }
    
    merkleData = generateMerkleTree(addresses);
    merkleCache.set(tokenId, merkleData);
    
    console.log(`Generated Merkle Tree for token ${tokenId}:`);
    console.log(`- Root: ${merkleData.root}`);
    console.log(`- Addresses: ${merkleData.addresses.length}`);
  }
  
  // Proofを返す
  const proof = merkleData.proofs.get(address.toLowerCase()) || [];
  console.log(`Proof for ${address}:`, proof);
  return proof;
}

/**
 * アドレスがMerkle Treeに含まれているか確認
 */
export function isInMerkleTree(address: string, tokenId: number = 0): boolean {
  const proof = getMerkleProof(address, tokenId);
  return proof.length > 0;
}

/**
 * Merkle Rootを取得
 */
export function getMerkleRoot(tokenId: number = 0): string | null {
  let merkleData = merkleCache.get(tokenId);
  
  if (!merkleData) {
    const addresses = loadAllowlistFromCSV();
    if (addresses.length === 0) {
      return null;
    }
    
    merkleData = generateMerkleTree(addresses);
    merkleCache.set(tokenId, merkleData);
  }
  
  return merkleData.root;
}

/**
 * Proof検証（デバッグ用）
 */
export function verifyProof(
  address: string,
  proof: string[],
  root: string
): boolean {
  const leaf = hashAddress(address);
  
  // MerkleTreeライブラリの検証機能を使用
  try {
    const proofBuffers = proof.map(p => Buffer.from(p.slice(2), 'hex'));
    return MerkleTree.verify(proofBuffers, leaf, Buffer.from(root.slice(2), 'hex'), keccak256, {
      sortPairs: true
    });
  } catch (error) {
    console.error('Proof verification error:', error);
    return false;
  }
}

/**
 * Merkleデータをファイルに保存（デバッグ用）
 */
export function saveMerkleData(tokenId: number = 0): void {
  const merkleData = merkleCache.get(tokenId);
  if (!merkleData) return;
  
  const dataToSave = {
    root: merkleData.root,
    addresses: merkleData.addresses,
    proofs: Object.fromEntries(merkleData.proofs),
    lastUpdated: merkleData.lastUpdated
  };
  
  const filePath = join(process.cwd(), `merkle-data-${tokenId}.json`);
  writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
  console.log(`Merkle data saved to ${filePath}`);
}