import { Box, Text } from "@mantine/core";
import { IconSearchOff } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";

interface PetSearchEmptyStateProps {
    query: string;
}

function PetSearchEmptyState({ query }: PetSearchEmptyStateProps) {
    const { t } = useTranslation();

    return (
        <Box className="col-[1/-1] mx-auto mt-[18px] w-[min(520px,100%)] rounded-[var(--roam-wobble-b)] border-[2.5px] border-dashed border-[var(--roam-ink)] bg-[var(--roam-peach-soft)] px-7 py-[26px] text-center text-[var(--roam-ink)] shadow-[var(--roam-shadow)]">
            <Box className="mb-2 inline-flex text-[var(--roam-blue)]">
                <IconSearchOff size={42} stroke={1.8} />
            </Box>
            <Text className="!font-note !text-2xl !leading-[1.1] !text-[var(--roam-ink)]">{t("No companions found")}</Text>
            <Text className="mt-1 !text-[15px] !text-[var(--roam-muted)]">
                {t("No companions match search", { query })}
            </Text>
        </Box>
    );
}

export default memo(PetSearchEmptyState);
