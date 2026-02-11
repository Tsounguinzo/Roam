import { Box, Button, Text } from "@mantine/core";
import { SettingActionRowProps } from "../../types";
import { ButtonVariant } from "../../../../utils";
import classes from "./SettingRow.module.css";

function SettingActionRow({ title, description, buttonLabel, onClick }: SettingActionRowProps) {
    return (
        <Box className={classes.row}>
            <Box className={classes.body}>
                <Text className={classes.title}>{title}</Text>
                <Text className={classes.description}>{description}</Text>
            </Box>
            <Button variant={ButtonVariant} onClick={onClick}>{buttonLabel}</Button>
        </Box>
    )
}

export default SettingActionRow
