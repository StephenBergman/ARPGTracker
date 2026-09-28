import { useEffect, useState } from "react";
import { loadDisplayMode, saveDisplayMode } from "../features/settings/settings.store";
import type { DisplayMode } from "../features/settings/settings.types";
import { setWidgetDisplayMode } from "../platform/window";

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(loadDisplayMode);

  useEffect(() => {
    saveDisplayMode(displayMode);
    void setWidgetDisplayMode(displayMode);
  }, [displayMode]);

  const toggleDisplayMode = () => setDisplayMode((current) => current === "expanded" ? "compact" : "expanded");
  return { displayMode, setDisplayMode, toggleDisplayMode };
}
