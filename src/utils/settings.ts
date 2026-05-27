import { Store } from "@tauri-apps/plugin-store";
import { IGetAppSetting } from "../types/ISetting";
import { invoke } from '@tauri-apps/api/core'
import { readTextFile, exists } from "@tauri-apps/plugin-fs"
import { confirm } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime } from "./runtime";

export function toggleAutoStartUp(allowAutoStartUp: boolean) {
    if (!isTauriRuntime()) return;

    (async () => {
        const hasEnabledStartUp = await invoke<boolean>("plugin:autostart|is_enabled");

        if (allowAutoStartUp) {
            if (!hasEnabledStartUp) await invoke("plugin:autostart|enable");
        } else if (hasEnabledStartUp) {
            await invoke("plugin:autostart|disable");
        }
    })()
};

// default will return app settings, if key is provided, will return specific key
export async function getAppSettings({ configName = "settings.json", key = "app", withErrorDialog = true }: IGetAppSetting) {
    if (!isTauriRuntime()) return;

    const configPath: string = await invoke("combine_config_path", { config_name: configName });
    const configExists = await exists(configPath);

    if (!configExists) {
        if (withErrorDialog) await confirm(`Could not get data from ${configPath}`, { title: "Roam", kind: 'error' });

        return;
    }

    const data = await readTextFile(configPath);
    const json = JSON.parse(data);
    return json[key];
}

// set a specific key under object app
// exp: { app: { key: value } }
interface ISetSetting extends IGetAppSetting {
    setKey: string,
    newValue: unknown,
}
export async function setSettings({ configName = "settings.json", key = "app", setKey, newValue }: ISetSetting) {
    if (!isTauriRuntime()) return;

    let setting: any = await getAppSettings({ configName });
    setting[setKey] = newValue;
    const configPath: string = await invoke("combine_config_path", { config_name: configName });
    // if not exist, create new file, so we don't need to check if file exists
    const store = await Store.load(configPath);
    await store.set(key, setting);
    await store.save();
}

// this function differs from setSettings because it will replace the whole config file, not just some specific key
export interface ISetConfig extends IGetAppSetting {
    newConfig: unknown,
}
export async function setConfig({ configName = "settings.json", key = "app", newConfig }: ISetConfig) {
    if (!isTauriRuntime()) return;

    const configPath: string = await invoke("combine_config_path", { config_name: configName });
    // if not exist, create new file, so we don't need to check if file exists
    const store = await Store.load(configPath);
    await store.set(key, newConfig);
    await store.save();
}

