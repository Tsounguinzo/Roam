import { create } from "zustand";
import { SettingsTabId } from "../types/ISetting";

interface ISettingTabState {
    activeTab: number;
    setActiveTab: (activeTab: number) => void;
}

export const useSettingTabStore = create<ISettingTabState>()((set) => ({
    activeTab: SettingsTabId.MyPets,
    setActiveTab: (activeTab: number) => set({ activeTab }),
}));
