import { createThirdwebClient } from "thirdweb";
import { sepolia, mainnet, polygon } from "thirdweb/chains";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!clientId) {
  throw new Error("Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID in environment variables");
}

export const client = createThirdwebClient({
  clientId: clientId,
});

const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "11155111";

export const chain = chainId === "1" ? mainnet : 
                   chainId === "137" ? polygon :
                   sepolia;

export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";