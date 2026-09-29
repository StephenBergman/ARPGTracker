export type DisplayMode = "compact" | "expanded";
export type WidgetPlacement = "free" | "topLeft" | "topCenter" | "topRight" | "leftCenter" | "rightCenter" | "bottomLeft" | "bottomCenter" | "bottomRight";
export interface WindowPosition { x: number; y: number; }
export interface WindowSize { width: number; height: number; }
export interface DisplayPreferences { launchAtStartup: boolean; widgetMode: boolean; showSeconds: boolean; showSeasonProgress: boolean; }
