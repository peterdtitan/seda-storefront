import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Șèdá — Contemporary Adire",
  description: "Contemporary Adire for everyday life. Made in Nigeria, designed for it too.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
