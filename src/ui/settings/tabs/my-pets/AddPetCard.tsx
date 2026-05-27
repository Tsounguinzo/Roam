import { Box, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { SettingsTabId } from "../../../../types/ISetting";
import { useTranslation } from "react-i18next";

function AddPetCard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation();

    return (
        <Box onClick={() => {
            searchParams.set('tab', SettingsTabId.PetStore.toString());
            searchParams.set('storeCategory', 'companions');
            setSearchParams(searchParams);
        }}
            className="flex h-[330px] w-52 max-w-[13rem] rotate-[0.6deg] cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--roam-wobble-b)] border-[2.5px] border-dashed border-[var(--roam-ink)] bg-[var(--roam-postit)] p-[var(--mantine-spacing-lg)] text-center shadow-[var(--roam-shadow)] transition-[transform,box-shadow] duration-[120ms] ease-in hover:translate-y-[-2px] hover:rotate-[-1deg] hover:shadow-[5px_7px_0_rgba(32,38,47,0.18)]">
            <IconPlus size={96} className="text-[var(--roam-blue)] hover:text-[var(--roam-brown)]" />
            <Box>
                <Text className="font-note text-2xl leading-none text-[var(--roam-ink)]">{t("Add a companion")}</Text>
                <Text className="mt-1 text-sm text-[var(--roam-muted)]">{t("Browse the Store")}</Text>
            </Box>
        </Box>
    )
}

export default AddPetCard;
