import { Box, Switch, Text } from "@mantine/core";
import { handleSettingChange } from "../../../../utils/handleSettingChange";
import { SettingToggleRowProps } from "../../types";
import classes from "./SettingRow.module.css";

function SettingToggleRow({ title, description, checked = false, dispatchType, component }: SettingToggleRowProps) {
    return (
        <Box className={classes.row}>
            <Box className={classes.body}>
                <Text className={classes.title}>{title}</Text>
                <Text className={classes.description}>{description}</Text>
                {component && <Box className={classes.extra}>{component}</Box>}
            </Box>
            <Switch size={"lg"} checked={checked} onChange={(event) => handleSettingChange(dispatchType, event.target.checked)} />
        </Box>
    )
}

export default SettingToggleRow
