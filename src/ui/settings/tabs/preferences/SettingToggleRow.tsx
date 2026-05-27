import { Box, Switch, Text } from "@mantine/core";
import { handleSettingChange } from "../../../../utils/handleSettingChange";
import { SettingToggleRowProps } from "../../types";

function SettingToggleRow({ title, description, checked = false, dispatchType, component }: SettingToggleRowProps) {
    return (
        <Box className="flex items-center justify-between gap-[18px] border-b-2 border-dashed border-[rgba(32,38,47,0.14)] px-4 py-[18px] last:border-b-0">
            <Box className="max-w-[620px]">
                <Text className="font-note text-[19px] font-normal text-[var(--roam-ink)]">{title}</Text>
                <Text className="mt-1 text-[0.92rem] leading-normal text-[var(--roam-muted)]">{description}</Text>
                {component && <Box className="mt-3.5">{component}</Box>}
            </Box>
            <Switch size={"lg"} checked={checked} onChange={(event) => handleSettingChange(dispatchType, event.target.checked)} />
        </Box>
    )
}

export default SettingToggleRow
