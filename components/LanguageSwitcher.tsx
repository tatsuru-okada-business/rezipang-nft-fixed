"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const redirectedPathname = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  };

  return (
    <div className="flex gap-2">
      <Link
        href={redirectedPathname("en")}
        className={`px-3 py-1 rounded-md transition-colors font-medium ${
          currentLocale === "en"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
        }`}
      >
        EN
      </Link>
      <Link
        href={redirectedPathname("ja")}
        className={`px-3 py-1 rounded-md transition-colors font-medium ${
          currentLocale === "ja"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
        }`}
      >
        日本語
      </Link>
    </div>
  );
}