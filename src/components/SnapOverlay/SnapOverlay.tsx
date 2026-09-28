import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { WidgetPlacement } from "../../features/settings/settings.types";
import styles from "./SnapOverlay.module.css";

const zones: ReadonlyArray<{ placement: WidgetPlacement; label: string }> = [{ placement: "topLeft", label: "Top left" }, { placement: "topCenter", label: "Top center" }, { placement: "topRight", label: "Top right" }, { placement: "leftCenter", label: "Left center" }, { placement: "free", label: "Free" }, { placement: "rightCenter", label: "Right center" }, { placement: "bottomLeft", label: "Bottom left" }, { placement: "bottomCenter", label: "Bottom center" }, { placement: "bottomRight", label: "Bottom right" }];

export function SnapOverlay() {
  const [active, setActive] = useState<WidgetPlacement>("free");
  useEffect(() => { let unlisten: (() => void) | undefined; void listen<WidgetPlacement>("widget-snap-preview", ({ payload }) => setActive(payload)).then((value) => { unlisten = value; }); return () => unlisten?.(); }, []);
  return <main className={styles.overlay} aria-label="Widget placement preview">{zones.map((zone) => <div className={styles.zone} data-active={active === zone.placement} data-placement={zone.placement} key={zone.placement}><span>{zone.label}</span></div>)}</main>;
}
