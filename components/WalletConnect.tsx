"use client";

import { ConnectButton } from "thirdweb/react";
import { client, chain } from "@/lib/thirdweb";
import { createWallet } from "thirdweb/wallets";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

const translations = {
  en,
  ja,
} as const;

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.zerion.wallet"),
];

export function WalletConnect({ locale = "en" }: { locale?: string }) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  return (
    <ConnectButton
      client={client}
      chain={chain}
      wallets={wallets}
      theme="light"
      connectButton={{
        label: t.wallet.connect,
        style: {
          fontSize: "16px",
          padding: "12px 24px",
        },
      }}
      detailsButton={{
        style: {
          fontSize: "14px",
        },
      }}
    />
  );
}