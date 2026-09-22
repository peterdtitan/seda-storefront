import type { Metadata } from "next";

import { fontVariables } from "@/styles/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Șèdá — Contemporary Adire",
  description: "Contemporary Adire for everyday life. Made in Nigeria, designed for it too.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
