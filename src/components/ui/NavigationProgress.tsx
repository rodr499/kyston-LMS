"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Shows a thin progress bar at the top of the viewport when the route changes,
 * so users get immediate feedback that navigation is happening.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setVisible(true);
    setKey((k) => k + 1);
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      key={key}
      className="navigation-progress-bar fixed top-0 left-0 right-0 z-9999 h-0.5 bg-primary rounded-r-full"
      aria-hidden
      role="presentation"
    />
  );
}
