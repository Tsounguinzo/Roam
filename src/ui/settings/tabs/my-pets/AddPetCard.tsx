import { Box } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { SettingsTabId } from "../../../../types/ISetting";

function AddPetCard() {
    const [searchParams, setSearchParams] = useSearchParams();

    return (
        // tab index 1 is Pet Store
        <Box onClick={() => {
            searchParams.set('tab', SettingsTabId.PetStore.toString());
            setSearchParams(searchParams);
        }}
            className="flex h-[330px] w-52 max-w-[13rem] rotate-[0.6deg] cursor-pointer flex-col items-center justify-center rounded-[var(--roam-wobble-b)] border-[2.5px] border-dashed border-[var(--roam-ink)] bg-[var(--roam-postit)] p-[var(--mantine-spacing-lg)] shadow-[var(--roam-shadow)] transition-[transform,box-shadow] duration-[120ms] ease-in hover:translate-y-[-2px] hover:rotate-[-1deg] hover:shadow-[5px_7px_0_rgba(32,38,47,0.18)]">
            <IconPlus size={128} className="text-[var(--roam-blue)] hover:text-[var(--roam-brown)]" />
        </Box>
    )
}

export default AddPetCard;
