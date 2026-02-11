import { DispatchType } from "../../types/IEvents";
import { SettingsTabDefinition } from "../../types/ISetting";

export interface SettingsSidebarNavItemProps {
    Icon: React.ReactNode;
    label: string;
    active: boolean;
    onSelect: () => void;
}

export interface SettingsSidebarNavProps {
    activeTab: number;
    tabs: SettingsTabDefinition[];
}

export interface PageHeaderProps {
    title: string;
    description: string;
}

export interface SettingToggleRowProps {
    title: string;
    description: string;
    checked: boolean;
    dispatchType: DispatchType;
    component?: React.ReactNode;
}

export interface SettingActionRowProps {
    title: string;
    description: string;
    buttonLabel: string;
    onClick: () => void;
}
