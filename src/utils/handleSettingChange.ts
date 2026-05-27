import { setSettings, toggleAutoStartUp } from "./settings";
import { useSettingStore } from "../hooks/useSettingStore";
import { emitUpdatePetsEvent } from "./event";
import i18next from "i18next";
import { error, info } from "@tauri-apps/plugin-log";
import { DispatchType } from "../types/IEvents";
import { ISpriteConfig } from "../types/ISpriteConfig";

interface IHandleSettingChange {
    (
        dispatchType: DispatchType,
        newValue: string | boolean | ISpriteConfig | number,
    ): void;
}
export const handleSettingChange: IHandleSettingChange = (
    dispatchType,
    newValue
) => {
    const {
        setLanguage,
        setAllowAutoStartUp,
        setAllowPetAboveTaskbar,
        setAllowPetInteraction,
        setAllowOverridePetScale,
        setPetScale,
        setAllowPetClimbing,
    } = useSettingStore.getState();

    info(`Change setting, kind: ${dispatchType}, value: ${newValue}`);

    const saveSetting = (setKey: string, value: unknown) => {
        void setSettings({ setKey, newValue: value }).catch((err) => {
            error(`Failed to save setting ${setKey}: ${err}`);
        });
    };

    const emitPetsEvent = () => {
        void emitUpdatePetsEvent({ dispatchType, newValue }).catch((err) => {
            error(`Failed to emit setting change ${dispatchType}: ${err}`);
        });
    };

    switch (dispatchType) {
        case DispatchType.ChangeAppLanguage:
            saveSetting("language", newValue);
            setLanguage(newValue as string);
            i18next.changeLanguage(newValue as string);
            localStorage.setItem("language", newValue as string);
            return;
        case DispatchType.SwitchAutoWindowStartUp:
            // auto start up doesn't need to be saved in settings.json
            toggleAutoStartUp(newValue as boolean);
            setAllowAutoStartUp(newValue as boolean);
            return;
        case DispatchType.SwitchPetAboveTaskbar:
            saveSetting("allowPetAboveTaskbar", newValue);
            setAllowPetAboveTaskbar(newValue as boolean);
            emitPetsEvent();
            return;
        case DispatchType.SwitchAllowPetInteraction:
            saveSetting("allowPetInteraction", newValue);
            setAllowPetInteraction(newValue as boolean);
            emitPetsEvent();
            return;
        case DispatchType.SwitchAllowPetClimbing:
            saveSetting("allowPetClimbing", newValue);
            setAllowPetClimbing(newValue as boolean);
            emitPetsEvent();
            return;
        case DispatchType.AddPet:
            emitPetsEvent();
            return;
        case DispatchType.RemovePet:
            emitPetsEvent();
            return;
        case DispatchType.OverridePetScale:
            saveSetting("allowOverridePetScale", newValue);
            setAllowOverridePetScale(newValue as boolean);
            emitPetsEvent();
            return;
        case DispatchType.ChangePetScale:
            saveSetting("petScale", newValue);
            setPetScale(newValue as number);
            emitPetsEvent();
            return;
        default:
            return;
    }
};
