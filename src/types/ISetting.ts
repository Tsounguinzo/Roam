import { MemoExoticComponent, ReactElement } from "react";

export interface IGetAppSetting {
    withErrorDialog?: boolean,
    configName?: string,
    key?: string,
}

export enum SettingsTabId {
    MyPets = 0,
    PetStore = 1,
    AddCustomPet = 2,
    Reminders = 3,
    Preferences = 4,
}

export interface SettingsTabDefinition {
    Component: MemoExoticComponent<() => ReactElement>,
    title: string,
    description: string,
    Icon: React.ReactNode;
    label: string;
    tab: SettingsTabId,
}

export enum DefaultConfigName {
    PET_LINKER = "pet_linker.json",
}
