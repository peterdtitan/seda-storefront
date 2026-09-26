import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Șèdá admin" },
  robots: { index: false, follow: false, nocache: true },
};

// Deliberately thin. The sign-in screens live under this segment but must not get the
// shell — a signed-out person has no nav to be shown. The (shell) group adds it.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
