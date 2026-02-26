"use client";

import { useEffect, useState } from "react";

export default function ClassListFeedback({
  saved,
  meetingError,
}: {
  saved?: string | null;
  meetingError?: string | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (saved === "1") {
      setVisible(true);
      window.history.replaceState(null, "", window.location.pathname);
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  if (!visible || saved !== "1") return null;

  return (
    <div className="mb-6">
      {meetingError ? (
        <div className="alert alert-warning rounded-xl border border-warning/30 shadow-sm">
          <span className="font-body">Class saved. {meetingError}</span>
        </div>
      ) : (
        <div className="alert alert-success rounded-xl border border-success/30 shadow-sm">
          <span className="font-body">Class saved successfully.</span>
        </div>
      )}
    </div>
  );
}
