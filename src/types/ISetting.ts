import { MemoExoticComponent, ReactElement } from "react";

export interface IGetAppSetting {
    withErrorDialog?: boolean,
    configName?: string,
    key?: string,
}

export enum SettingsTabId {
    MyPets = 0,
    PetStore = 1,
    Reminders = 2,
    Preferences = 3,
}

export interface SettingsTabDefinition {
    Component: MemoExoticComponent<() => ReactElement>,
    title: string,
    description: string,
    Icon: React.ReactNode;
    label: string;
    tab: SettingsTabId,
}

