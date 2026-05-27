import { Update } from "@tauri-apps/plugin-updater";
import { ISpriteConfig } from "../ISpriteConfig";

export enum PetCardType {
    Add = "add",
    Remove = "remove",
}

export interface IPetCardProps {
    btnLabel: string,
    pet: ISpriteConfig,
    btnFunction: () => void,
    type: PetCardType,
}

export interface PhaserCanvasProps {
    pet: ISpriteConfig,
    playState: string,
}

export interface UpdaterPopupProps {
    shouldUpdate: boolean,
    manifest: Update | undefined,
}
