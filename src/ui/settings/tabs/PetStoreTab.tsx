import { Box, Button, Text, TextInput } from "@mantine/core";
import { memo, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PetCard from "../../components/PetCard";
import { useTranslation } from "react-i18next";
import { ISpriteConfig } from "../../../types/ISpriteConfig";
import { getAppSettings, setConfig } from "../../../utils/settings";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlayerPlay } from "@tabler/icons-react";
import { PrimaryColor } from "../../../utils";
import { handleSettingChange } from "../../../utils/handleSettingChange";
import { PetCardType } from "../../../types/components/type";
import { useSettingStore } from "../../../hooks/useSettingStore";
import { DispatchType } from "../../../types/IEvents";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import PetSearchEmptyState from "./PetSearchEmptyState";
import SectionCard from "../layout/SectionCard";
import { BANNER_THEMES, FLIER_COLORS, FLIER_HEADS, FONT_OPTIONS, SOUND_OPTIONS } from "./reminders/options";
import { addOwnedReminderItem, getStoreItemAccess, readOwnedReminderItems, type ReminderItemCategory, type StoreItemAccess } from "./reminders/ownership";

type StoreCategoryId = 'companions' | ReminderItemCategory;

interface StoreCategory {
    id: StoreCategoryId;
    title: string;
}

interface StoreProduct {
    id: string;
    name: string;
    category: ReminderItemCategory;
    free: boolean;
    image?: string;
    preview?: React.ReactNode;
    previewAudioUrl?: string;
}

const accessLabel: Record<StoreItemAccess, string> = {
    owned: "Owned",
    free: "Free",
    premium: "Premium",
};
const storeCategoryIds: StoreCategoryId[] = ['companions', 'avatar', 'plane', 'banner', 'text', 'sound'];

const isStoreCategoryId = (value: string | null): value is StoreCategoryId => Boolean(value && storeCategoryIds.includes(value as StoreCategoryId));

function playSoundPreview(url: string | undefined) {
    if (!url) return;

    try {
        const audio = new Audio(url);
        audio.volume = 0.9;
        void audio.play();
    } catch {
        /* store previews are best-effort */
    }
}

function PetStoreTab() {
    const { setPets, defaultPet } = useSettingStore();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [ownedItems, setOwnedItems] = useState(readOwnedReminderItems);
    const [activeCategory, setActiveCategory] = useState<StoreCategoryId>(() => {
        const category = searchParams.get('storeCategory');
        return isStoreCategoryId(category) ? category : 'companions';
    });

    const addPetToConfig = useCallback(async (pet: ISpriteConfig) => {
        const userPetConfig = (await getAppSettings({ configName: "pets.json" })) ?? [];
        userPetConfig.push({ ...pet, id: crypto.randomUUID() });

        await setConfig({ configName: "pets.json", newConfig: userPetConfig });
        setPets(userPetConfig);

        if (!await WebviewWindow.getByLabel('main')) await invoke("reopen_main_window");

        notifications.show({
            message: t("pet name has been added to your realm", { name: pet.name }),
            title: t("Pet Added"),
            color: PrimaryColor,
            icon: <IconCheck size="1rem" />,
            withBorder: true,
            autoClose: 800,
        })

        // update pet window to show new pet
        handleSettingChange(DispatchType.AddPet, pet);
    }, [setPets, t]);

    const filteredPets = useMemo(() => {
        return defaultPet.filter(pet =>
            pet.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, defaultPet]);

    const PetCards = useMemo(() => {
        return filteredPets.map((pet: ISpriteConfig, index: number) => {
            return <PetCard key={index} pet={pet} btnLabel={t("Add to Collection")} type={PetCardType.Add} btnFunction={() => addPetToConfig(pet)} />
        });
    }, [t, filteredPets, addPetToConfig]);
    const hasSearchQuery = searchQuery.trim().length > 0;
    const categories: StoreCategory[] = useMemo(() => [
        {
            id: 'companions',
            title: t('Companions'),
        },
        {
            id: 'avatar',
            title: t('Avatar'),
        },
        {
            id: 'plane',
            title: t('Plane'),
        },
        {
            id: 'banner',
            title: t('Banner'),
        },
        {
            id: 'text',
            title: t('Text'),
        },
        {
            id: 'sound',
            title: t('Sound'),
        },
    ], [t]);

    const storeProducts = useMemo<StoreProduct[]>(() => {
        if (activeCategory === 'avatar') {
            return FLIER_HEADS.map((item) => ({
                id: item.id,
                name: item.name,
                category: 'avatar',
                free: item.free,
                image: item.thumb,
            }));
        }

        if (activeCategory === 'plane') {
            return FLIER_COLORS.map((item) => ({
                id: item.id,
                name: item.name,
                category: 'plane',
                free: item.free,
                image: item.plane,
            }));
        }

        if (activeCategory === 'banner') {
            return BANNER_THEMES.map((item) => ({
                id: item.id,
                name: item.name,
                category: 'banner',
                free: item.free,
                preview: <span className="h-9 w-full rounded-[var(--roam-wobble-a)] border-2 border-[var(--roam-ink)]" style={{ background: `repeating-linear-gradient(-8deg, ${item.a} 0 10px, ${item.b} 10px 20px)` }} />,
            }));
        }

        if (activeCategory === 'text') {
            return FONT_OPTIONS.map((item) => ({
                id: item.id,
                name: item.name,
                category: 'text',
                free: true,
                preview: <span className="text-2xl" style={{ fontFamily: item.stack }}>Aa</span>,
            }));
        }

        if (activeCategory === 'sound') {
            return SOUND_OPTIONS.map((item) => ({
                id: item.id,
                name: item.name,
                category: 'sound',
                free: item.free,
                preview: <span className="font-note text-3xl">♪</span>,
                previewAudioUrl: item.url,
            }));
        }

        return [];
    }, [activeCategory, t]);
    const addStoreProduct = useCallback((item: StoreProduct) => {
        const access = getStoreItemAccess(item.category, item.id, item.free, ownedItems);
        if (access !== "free") return;

        const nextItems = addOwnedReminderItem(item.category, item.id);
        setOwnedItems(nextItems);
        notifications.show({
            message: t("item has been added to your collection", { name: item.name }),
            title: t("Added to Collection"),
            color: PrimaryColor,
            icon: <IconCheck size="1rem" />,
            withBorder: true,
            autoClose: 900,
        });
    }, [ownedItems, t]);
    const handleSetCategory = useCallback((category: StoreCategoryId) => {
        setActiveCategory(category);
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('storeCategory', category);
        setSearchParams(nextSearchParams);
    }, [searchParams, setSearchParams]);

    return (
        <Box className="flex flex-col gap-5">
            <SectionCard title={t("Store")} description={t("Add companions and reminder styles to your collection. Premium items can appear here later.")}>
                <Box className="reminder-subnav" role="tablist" aria-label={t("Store categories")}>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            className={`reminder-subnav-item ${activeCategory === category.id ? 'reminder-subnav-item-active' : ''}`}
                            onClick={() => handleSetCategory(category.id)}
                        >
                            {category.title}
                        </button>
                    ))}
                </Box>

                {activeCategory === 'companions' ? (
                    <>
                    <Box className="settings-toolbar mt-7">
                        <TextInput
                            placeholder={t("Search companions")}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            className="min-w-0"
                        />
                        <Text className="font-note text-lg text-[var(--roam-muted)]">
                            {t("Showing companions", { count: filteredPets.length })}
                        </Text>
                    </Box>

                    <Box className="grid place-items-center gap-6 pb-2 pt-7 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                        {PetCards.length > 0 ? PetCards : hasSearchQuery && <PetSearchEmptyState query={searchQuery} />}
                    </Box>
                    </>
                ) : (
                    <Box className="store-product-grid mt-7">
                        {storeProducts.map((item) => {
                            const access = getStoreItemAccess(item.category, item.id, item.free, ownedItems);

                            return (
                            <Box key={item.id} className="store-product-card">
                                <Box className="store-product-art">
                                    {item.image ? <img src={item.image} alt="" /> : item.preview}
                                </Box>
                                <Box>
                                    <Text className="store-product-name">{item.name}</Text>
                                </Box>
                                <Box className="grid gap-2">
                                    {item.previewAudioUrl && (
                                        <Button size="xs" leftSection={<IconPlayerPlay size={15} />} onClick={() => playSoundPreview(item.previewAudioUrl)}>
                                            {t("Preview")}
                                        </Button>
                                    )}
                                    {access === "free" ? (
                                        <Button size="xs" onClick={() => addStoreProduct(item)}>
                                            {t("Add to Collection")}
                                        </Button>
                                    ) : (
                                        <Text className="store-access-label">{t(accessLabel[access])}</Text>
                                    )}
                                </Box>
                            </Box>
                            );
                        })}
                    </Box>
                )}
            </SectionCard>
        </Box>
    )
}

export default memo(PetStoreTab);
