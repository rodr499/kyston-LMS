"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";

export default function ShareButton({ classId, className }: { classId: string; className: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/learn/classes/${classId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: className, url });
      } catch {
        // user dismissed — no-op
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="btn btn-ghost btn-xs rounded-lg text-base-content/30 hover:text-base-content/60"
      title={copied ? "Link copied!" : "Share this class"}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
    </button>
  );
}
