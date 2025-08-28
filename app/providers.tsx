"use client";

import React from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { ThemeProvider } from "@/components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ThirdwebProvider>
  );
}