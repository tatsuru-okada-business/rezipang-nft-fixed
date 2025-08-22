"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

const translations = {
  en,
  ja,
} as const;

export function AllowlistStatus({ locale = "en" }: { locale?: string }) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const account = useActiveAccount();
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAllowlist() {
      if (!account?.address) {
        setIsAllowlisted(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/verify-allowlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address: account.address }),
        });

        const data = await response.json();
        setIsAllowlisted(data.isAllowlisted);
      } catch (error) {
        console.error("Error checking allowlist:", error);
        setIsAllowlisted(false);
      } finally {
        setLoading(false);
      }
    }

    checkAllowlist();
  }, [account?.address]);

  if (!account) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center text-gray-600">
        {t.wallet.checking}
      </div>
    );
  }

  return (
    <div className="text-center">
      {isAllowlisted ? (
        <div className="text-green-600 font-semibold">
          {t.wallet.allowlisted}
        </div>
      ) : (
        <div className="text-red-600 font-semibold">
          {t.wallet.notAllowlisted}
        </div>
      )}
    </div>
  );
}