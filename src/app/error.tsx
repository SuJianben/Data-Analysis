"use client";

import { useEffect } from "react";
import { DataSourceNotice } from "@/components/data-source/data-source-notice";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page page-enter">
      <DataSourceNotice onRetry={reset} />
    </div>
  );
}
