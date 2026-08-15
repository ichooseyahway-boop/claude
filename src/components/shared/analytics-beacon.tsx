"use client";

import { useEffect } from "react";
import { track, type FunnelEvent, type AnalyticsProps } from "@/lib/analytics";

/**
 * Fires a single funnel event when the page mounts. Rendered from server pages
 * to instrument the funnel without pulling private data into the client bundle.
 */
export function AnalyticsBeacon({
  event,
  props,
}: {
  event: FunnelEvent;
  props?: AnalyticsProps;
}) {
  useEffect(() => {
    track(event, props);
    // Intentionally fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
