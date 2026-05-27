import { Box, Select, Slider, Switch, Text } from "@mantine/core";
import languages from "../../../locale/languages";
import SettingToggleRow from "./preferences/SettingToggleRow";
import { useTranslation } from "react-i18next";
import { handleSettingChange } from "../../../utils/handleSettingChange";
import { useSettingStore } from "../../../hooks/useSettingStore";
import { memo, useCallback, useState } from "react";
import { IconLanguage } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import SettingActionRow from "./preferences/SettingActionRow";
import { DispatchType } from "../../../types/IEvents";
import SectionCard from "../layout/SectionCard";
import { readReminderPrefs, updateReminderPrefs } from "./reminders/options";

interface PreferencesToggleItem {
    title: string,
    description: string,
    checked: boolean,
    dispatchType: DispatchType,
    component?: React.ReactNode,
}

function PreferencesTab() {
    const { t, i18n } = useTranslation();
    const { allowAutoStartUp, allowPetAboveTaskbar, allowPetInteraction, allowOverridePetScale, petScale, allowPetClimbing } = useSettingStore();
    const [reminderSoundEnabled, setReminderSoundEnabled] = useState(() => readReminderPrefs().soundEnabled);

    const appSwitches: PreferencesToggleItem[] = [
        {
            title: t("Auto start-up"),
            description: t("Automatically open Roam when your computer starts."),
            checked: allowAutoStartUp,
            dispatchType: DispatchType.SwitchAutoWindowStartUp,
        },
    ];

    const petBehaviorSwitches: PreferencesToggleItem[] = [
        {
            title: t("Companion above taskbar"),
            description: t("Keep companions floating above the taskbar on Windows."),
            checked: allowPetAboveTaskbar,
            dispatchType: DispatchType.SwitchPetAboveTaskbar,
        },
        {
            title: t("Companion interactions"),
            description: t("Let you drag companions and move them around the desktop."),
            checked: allowPetInteraction,
            dispatchType: DispatchType.SwitchAllowPetInteraction,
        },
        {
            title: t("Allow companion climb"),
            description: t("Let companions climb along the left, right, and top edges of the screen."),
            checked: allowPetClimbing,
            dispatchType: DispatchType.SwitchAllowPetClimbing,
        },
        {
            title: t("Override companion scale"),
            description: t("Use one shared size for all companions, ignoring individual companion scale values."),
            checked: allowOverridePetScale,
            dispatchType: DispatchType.OverridePetScale,
            component: allowOverridePetScale &&
                <Slider min={0.1} max={1} defaultValue={petScale} my={"sm"} step={0.1} onChangeEnd={(value) => handleSettingChange(DispatchType.ChangePetScale, value)} />,
        }
    ];

    const appToggleRows = appSwitches.map((setting) => {
        return <SettingToggleRow {...setting} key={setting.title} />
    });

    const petBehaviorToggleRows = petBehaviorSwitches.map((setting) => {
        return <SettingToggleRow {...setting} key={setting.title} />
    });

    const openConfigFolder = useCallback(async () => {
        const configPath: string = await invoke("combine_config_path", { config_name: "" });
        await invoke("open_folder", { path: configPath });
    }, []);
    const handleReminderSoundChange = useCallback((enabled: boolean) => {
        updateReminderPrefs({ soundEnabled: enabled });
        setReminderSoundEnabled(enabled);
    }, []);

    return (
        <Box className="flex flex-col gap-[18px]">
            <SectionCard
                title={t("App and data")}
                description={t("Controls that affect Roam itself, your language, and where local files live.")}
            >
                {appToggleRows}
                <SettingActionRow
                    title={t("App Config Path")}
                    description={t(`The location path of where the app store your config such as settings, pets, etc`)}
                    buttonLabel={t("Open")}
                    onClick={openConfigFolder}
                />
                <Box className="flex items-center justify-between gap-5 px-4 py-[18px] max-[860px]:flex-col max-[860px]:items-start">
                    <Box>
                        <Text className="font-note text-[19px] font-normal text-[var(--roam-ink)]">{t("Language")}</Text>
                        <Text className="mt-1 text-[0.92rem] text-[var(--roam-muted)]">{t("Choose your display language for the app")}</Text>
                    </Box>
                    <Select
                        className="min-w-[230px] max-[860px]:w-full max-[860px]:min-w-full"
                        leftSection={<IconLanguage size={18} />}
                        allowDeselect={false}
                        checkIconPosition={"right"}
                        placeholder="Pick one"
                        data={languages}
                        maxDropdownHeight={400}
                        value={i18n.language}
                        onChange={(value) => handleSettingChange(DispatchType.ChangeAppLanguage, value as string)}
                    />
                </Box>
            </SectionCard>

            <SectionCard
                title={t("Companion behavior")}
                description={t("Controls for how companions move, climb, scale, and sit around the desktop.")}
            >
                {petBehaviorToggleRows}
            </SectionCard>

            <SectionCard
                title={t("Reminder preferences")}
                description={t("General reminder behavior that is not tied to a single saved reminder.")}
            >
                <Box className="flex items-center justify-between gap-[18px] px-4 py-[18px] max-[760px]:items-start">
                    <Box className="max-w-[620px]">
                        <Text className="font-note text-[19px] font-normal text-[var(--roam-ink)]">{t("Reminder sound")}</Text>
                        <Text className="mt-1 text-[0.92rem] leading-normal text-[var(--roam-muted)]">{t("Play sound during reminders and test flights")}</Text>
                    </Box>
                    <Switch size={"lg"} checked={reminderSoundEnabled} onChange={(event) => handleReminderSoundChange(event.currentTarget.checked)} />
                </Box>
            </SectionCard>
        </Box>
    )
}

export default memo(PreferencesTab);
