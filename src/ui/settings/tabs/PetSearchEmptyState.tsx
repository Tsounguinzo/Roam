import { Box, Text } from "@mantine/core";
import { IconSearchOff } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import classes from "./PetSearchEmptyState.module.css";

interface PetSearchEmptyStateProps {
    query: string;
}

function PetSearchEmptyState({ query }: PetSearchEmptyStateProps) {
    const { t } = useTranslation();

    return (
        <Box className={classes.emptyState}>
            <Box className={classes.icon}>
                <IconSearchOff size={42} stroke={1.8} />
            </Box>
            <Text className={classes.title}>{t("No pets found")}</Text>
            <Text className={classes.description}>
                {t("No pets match search", { query })}
            </Text>
        </Box>
    );
}

export default memo(PetSearchEmptyState);
