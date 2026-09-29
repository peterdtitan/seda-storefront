"use client";

import { PanelError } from "@/components/admin/PanelError";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PanelError {...props} />;
}
