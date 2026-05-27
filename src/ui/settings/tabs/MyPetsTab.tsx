import { memo, useCallback, useMemo, useState } from "react";
import PetCard from "../../components/PetCard";
import { Box, Text, TextInput } from "@mantine/core";
import AddPetCard from "./my-pets/AddPetCard";
import { useTranslation } from "react-i18next";
import { useSettingStore } from "../../../hooks/useSettingStore";
import { ISpriteConfig } from "../../../types/ISpriteConfig";
import { getAppSettings, setConfig } from "../../../utils/settings";
import { notifications } from "@mantine/notifications";
import { PrimaryColor } from "../../../utils";
import { IconCheck } from "@tabler/icons-react";
import { handleSettingChange } from "../../../utils/handleSettingChange";
import { PetCardType } from "../../../types/components/type";
import { DispatchType } from "../../../types/IEvents";
import { usePets } from "../../../hooks/usePets";
import PetSearchEmptyState from "./PetSearchEmptyState";
import { error } from "@tauri-apps/plugin-log";
import SectionCard from "../layout/SectionCard";

export function MyPetsTab() {
    const { refetch } = usePets();
    const { t } = useTranslation();
    const { pets, setPets } = useSettingStore();
    const [searchQuery, setSearchQuery] = useState("");

    const removePet = useCallback(async (petId: string) => {
        try {
            const userPetConfig = (await getAppSettings({ configName: "pets.json" })) ?? [];
            let removedPetName = "";
            const newConfig = userPetConfig.filter((pet: ISpriteConfig) => {
                if (pet.id === petId) removedPetName = pet.name;
                return pet.id !== petId;
            });

            await setConfig({ configName: "pets.json", newConfig: newConfig });
            setPets(newConfig);
            handleSettingChange(DispatchType.RemovePet, petId);

            notifications.show({
                message: t("pet name has been removed", { name: removedPetName }),
                title: t("Pet Removed"),
                color: PrimaryColor,
                icon: <IconCheck size="1rem" />,
                withBorder: true,
                autoClose: 800,
            });

            await refetch();
        } catch (err) {
            error(`Failed to remove pet: ${err}`);
            notifications.show({
                message: String(err),
                title: t("Error: Pet cannot be removed"),
                color: PrimaryColor,
                withBorder: true,
                autoClose: 3000,
            });
        }
    }, [refetch, setPets, t]);

    const filteredPets = useMemo(() => {
        return pets.filter(pet =>
            pet.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, pets]);

    const PetCards = useMemo(() => {
        return filteredPets.map((pet: ISpriteConfig) => {
            return (
                <PetCard key={pet.id} pet={pet} btnLabel={t("Remove")} type={PetCardType.Remove} btnFunction={() => removePet(pet.id as string)} />
            );
        });
    }, [t, filteredPets, removePet]);
    const hasSearchQuery = searchQuery.trim().length > 0;

    return (
        <Box className="flex flex-col gap-5">
            <SectionCard title={t("Companions")} description={t("Manage the desktop characters currently in your collection.")}>
            <Box className="settings-toolbar">
                <TextInput
                    placeholder={t("Search your companions")}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    className="min-w-0"
                />
                <Text className="font-note text-lg text-[var(--roam-muted)]">
                    {t("Showing companions", { count: filteredPets.length })}
                </Text>
            </Box>

            <Box className="grid place-items-center gap-4 p-5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                {PetCards.length > 0 ? PetCards : hasSearchQuery && <PetSearchEmptyState query={searchQuery} />}
                {!hasSearchQuery && <AddPetCard />}
            </Box>
            </SectionCard>
        </Box>
    );
}

export default memo(MyPetsTab);
