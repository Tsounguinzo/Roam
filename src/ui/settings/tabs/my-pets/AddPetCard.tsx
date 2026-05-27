import { Box } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { SettingsTabId } from "../../../../types/ISetting";
import classes from "./AddPetCard.module.css";

function AddPetCard() {
    const [searchParams, setSearchParams] = useSearchParams();

    return (
        // tab index 1 is Pet Store
        <Box onClick={() => {
            searchParams.set('tab', SettingsTabId.PetStore.toString());
            setSearchParams(searchParams);
        }}
            // class module is used  because mantine inline style doesn't support pseudo classes
            // https://mantine.dev/styles/styles-api/#styles-prop
            className={classes.box}
            style={(mantineTheme) => ({
                maxWidth: '13rem',
                padding: mantineTheme.spacing.lg,
                width: '208px',
                height: '330px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
            })}>
            <IconPlus size={128} className={classes.plus} />
        </Box>
    )
}

export default AddPetCard;
