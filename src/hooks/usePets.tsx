import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { getAppSettings, setConfig } from "../utils/settings";
import { useSettingStore } from "./useSettingStore";
import { ISpriteConfig } from "../types/ISpriteConfig";
import defaultPetConfig from "../config/pet_config";

const { setPets, setDefaultPet } = useSettingStore.getState();

const getPets = async () => {
    let saveConfigAgain = false;
    const pets: ISpriteConfig[] | undefined = await getAppSettings({ configName: "pets.json" });

    if (!pets || pets.length === 0) {
        setPets([]);
        return [];
    }

    // check if all pets has unique id if no add id and after all check, save config again
    pets.forEach((pet: ISpriteConfig) => {
        if (!pet.id) {
            pet.id = crypto.randomUUID();
            saveConfigAgain = true;
        }
    });

    if (saveConfigAgain) await setConfig({ configName: "pets.json", newConfig: pets });

    setPets(pets);
    return pets;
};

export function usePets(): UseQueryResult<unknown, Error> {
    return useQuery({ queryKey: ['pets'], queryFn: getPets, refetchOnWindowFocus: false,
        // disable cache
        gcTime: 0,
     });
};

const getDefaultPets = async () => {
    const defaultPets: ISpriteConfig[] = JSON.parse(JSON.stringify(defaultPetConfig));

    setDefaultPet(defaultPets);
    return defaultPets;
};

export function useDefaultPets(): UseQueryResult<unknown, Error> {
    return useQuery({ queryKey: ['defaultPets'], queryFn: getDefaultPets, refetchOnWindowFocus: false,
        // disable cache
        gcTime: 0,
     });
}
