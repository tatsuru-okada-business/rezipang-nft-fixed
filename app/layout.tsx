import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFT Mint Site",
  description: "Exclusive NFT minting for allowlisted addresses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
