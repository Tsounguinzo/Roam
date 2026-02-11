import { Box, Select, Slider, Switch, Text } from "@mantine/core";
import languages from "../../../locale/languages";
import SettingToggleRow from "./preferences/SettingToggleRow";
import { useTranslation } from "react-i18next";
import { handleSettingChange } from "../../../utils/handleSettingChange";
import { useSettingStore } from "../../../hooks/useSettingStore";
import { memo, useCallback } from "react";
import { IconLanguage } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/tauri";
import SettingActionRow from "./preferences/SettingActionRow";
import { DispatchType } from "../../../types/IEvents";
import { ColorSchemeType } from "../../../types/ISetting";
import classes from "./PreferencesTab.module.css";
import rowClasses from "./preferences/SettingRow.module.css";

interface PreferencesToggleItem {
    title: string,
    description: string,
    checked: boolean,
    dispatchType: DispatchType,
    component?: React.ReactNode,
}

function PreferencesTab() {
    const { t, i18n } = useTranslation();
    const { allowAutoStartUp, allowPetAboveTaskbar, allowPetInteraction, allowOverridePetScale, petScale, allowPetClimbing, theme } = useSettingStore();

    const generalSwitches: PreferencesToggleItem[] = [
        {
            title: t("Auto start-up"),
            description: t("Automatically open Roam every time u start the computer"),
            checked: allowAutoStartUp,
            dispatchType: DispatchType.SwitchAutoWindowStartUp,
        },
        {
            title: t("Pet above taskbar"),
            description: t("Make the pet float above taskbar (For Window User)"),
            checked: allowPetAboveTaskbar,
            dispatchType: DispatchType.SwitchPetAboveTaskbar,
        },
        {
            title: t("Pet interactions"),
            description: t("If allow pet interaction turn on, user will be able to drag and move the pet around their window"),
            checked: allowPetInteraction,
            dispatchType: DispatchType.SwitchAllowPetInteraction,
        },
        {
            title: t("Allow pet climb"),
            description: t("If allow pet climb turn on, pet will be able to climb on the left, right, and top of the window"),
            checked: allowPetClimbing,
            dispatchType: DispatchType.SwitchAllowPetClimbing,
        },
        {
            title: t("Override pet scale"),
            description: t("Allow the program to adjust all pet sizes by a fixed amount determined by your preferences, ignoring any individual pet scales"),
            checked: allowOverridePetScale,
            dispatchType: DispatchType.OverridePetScale,
            component: allowOverridePetScale &&
                <Slider min={0.1} max={1} defaultValue={petScale} my={"sm"} step={0.1} onChangeEnd={(value) => handleSettingChange(DispatchType.ChangePetScale, value)} />,
        }
    ];

    const generalToggleRows = generalSwitches.map((setting, index) => {
        return <SettingToggleRow {...setting} key={index} />
    });

    const openConfigFolder = useCallback(async () => {
        const configPath: string = await invoke("combine_config_path", { config_name: "" });
        await invoke("open_folder", { path: configPath });
    }, []);

    return (
        <Box className={classes.page}>
                <Text className={classes.sectionTitle}>General</Text>
                <Box className={classes.panel}>
                {generalToggleRows}
            </Box>

            <Text className={classes.sectionTitle}>Appearance</Text>
            <Box className={classes.panel}>
                <Box className={rowClasses.row}>
                    <Box className={rowClasses.body}>
                        <Text className={rowClasses.title}>{t("Dark mode")}</Text>
                        <Text className={rowClasses.description}>{t("Use dark mode for the app appearance")}</Text>
                    </Box>
                    <Switch
                        size={"lg"}
                        checked={theme === ColorSchemeType.Dark}
                        onChange={(event) =>
                            handleSettingChange(
                                DispatchType.ChangeAppTheme,
                                event.target.checked ? ColorSchemeType.Dark : ColorSchemeType.Light
                            )
                        }
                    />
                </Box>
                <SettingActionRow
                    title={t("App Config Path")}
                    description={t(`The location path of where the app store your config such as settings, pets, etc`)}
                    buttonLabel={t("Open")}
                    onClick={openConfigFolder}
                />
                <Box className={classes.languageRow}>
                    <Box>
                        <Text className={classes.rowTitle}>{t("Language")}</Text>
                        <Text className={classes.rowDescription}>{t("Choose your display language for the app")}</Text>
                    </Box>
                    <Select
                        className={classes.languageSelect}
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
            </Box>
        </Box>
    )
}

export default memo(PreferencesTab);
