import { MemoExoticComponent } from "react";

export interface IGetAppSetting {
    withErrorDialog?: boolean,
    configName?: string,
    key?: string,
}

export enum ColorSchemeType {
    Light = "light",
    Dark = "dark",
}

export type ColorScheme = ColorSchemeType.Light | ColorSchemeType.Dark;

export enum SettingsTabId {
    MyPets = 0,
    PetStore = 1,
    AddCustomPet = 2,
    Preferences = 3,
    About = 4,
}

export interface SettingsTabDefinition {
    Component: MemoExoticComponent<() => JSX.Element>,
    title: string,
    description: string,
    Icon: React.ReactNode;
    label: string;
    tab: SettingsTabId,
}

export enum DefaultConfigName {
    PET_LINKER = "pet_linker.json",
}
