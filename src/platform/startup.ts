import { isTauri } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

let synchronization = Promise.resolve();

export function synchronizeLaunchAtStartup(preferred: boolean): Promise<void> {
  if (!isTauri()) return Promise.resolve();
  synchronization = synchronization.catch(() => undefined).then(async () => {
    const registered = await isEnabled();
    if (preferred && !registered) await enable();
    if (!preferred && registered) await disable();
  });
  return synchronization;
}
