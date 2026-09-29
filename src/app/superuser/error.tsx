"use client";

import { PanelError } from "@/components/admin/PanelError";

export default function SuperuserError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PanelError {...props} homeHref="/superuser" homeLabel="Back to the platform" />;
}
