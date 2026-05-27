import { DEFAULT_REMINDER_PREFS } from "./options";

export type ReminderItemCategory = "avatar" | "plane" | "banner" | "text" | "sound";
export type StoreItemAccess = "owned" | "free" | "premium";

export type OwnedReminderItems = Record<ReminderItemCategory, string[]>;

export const REMINDER_OWNED_ITEMS_KEY = "roam-owned-reminder-items";
export const REMINDER_OWNED_ITEMS_CHANGED = "roam-owned-reminder-items-changed";

export const DEFAULT_OWNED_REMINDER_ITEMS: OwnedReminderItems = {
    avatar: [DEFAULT_REMINDER_PREFS.flierHead],
    plane: [DEFAULT_REMINDER_PREFS.flierColor],
    banner: [DEFAULT_REMINDER_PREFS.theme],
    text: [DEFAULT_REMINDER_PREFS.font],
    sound: [DEFAULT_REMINDER_PREFS.soundPack],
};

const unique = (items: string[]) => Array.from(new Set(items));

export function readOwnedReminderItems(): OwnedReminderItems {
    try {
        const stored = JSON.parse(localStorage.getItem(REMINDER_OWNED_ITEMS_KEY) ?? "null") as Partial<OwnedReminderItems> | null;

        return {
            avatar: unique([...DEFAULT_OWNED_REMINDER_ITEMS.avatar, ...(stored?.avatar ?? [])]),
            plane: unique([...DEFAULT_OWNED_REMINDER_ITEMS.plane, ...(stored?.plane ?? [])]),
            banner: unique([...DEFAULT_OWNED_REMINDER_ITEMS.banner, ...(stored?.banner ?? [])]),
            text: unique([...DEFAULT_OWNED_REMINDER_ITEMS.text, ...(stored?.text ?? [])]),
            sound: unique([...DEFAULT_OWNED_REMINDER_ITEMS.sound, ...(stored?.sound ?? [])]),
        };
    } catch {
        return DEFAULT_OWNED_REMINDER_ITEMS;
    }
}

export function ownsReminderItem(category: ReminderItemCategory, id: string, ownedItems = readOwnedReminderItems()) {
    return ownedItems[category].includes(id);
}

export function getStoreItemAccess(category: ReminderItemCategory, id: string, isFree: boolean, ownedItems = readOwnedReminderItems()): StoreItemAccess {
    if (ownsReminderItem(category, id, ownedItems)) return "owned";
    return isFree ? "free" : "premium";
}

export function addOwnedReminderItem(category: ReminderItemCategory, id: string) {
    const ownedItems = readOwnedReminderItems();
    const nextItems: OwnedReminderItems = {
        ...ownedItems,
        [category]: unique([...ownedItems[category], id]),
    };

    localStorage.setItem(REMINDER_OWNED_ITEMS_KEY, JSON.stringify(nextItems));
    window.dispatchEvent(new CustomEvent(REMINDER_OWNED_ITEMS_CHANGED, { detail: nextItems }));

    return nextItems;
}
