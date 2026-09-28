import { useEffect, useState } from "react";
import { loadDisplayMode, saveDisplayMode } from "../features/settings/settings.store";
import type { DisplayMode } from "../features/settings/settings.types";

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(loadDisplayMode);

  useEffect(() => {
    saveDisplayMode(displayMode);
  }, [displayMode]);

  const toggleDisplayMode = () => setDisplayMode((current) => current === "expanded" ? "compact" : "expanded");
  return { displayMode, setDisplayMode, toggleDisplayMode };
}
