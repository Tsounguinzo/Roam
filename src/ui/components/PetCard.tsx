import { Box, Button, Group, NativeSelect, Select, Title } from "@mantine/core";
import { memo, useEffect, useState } from "react";
import { IPetCardProps, PetCardType } from "../../types/components/type";
import PhaserCanvas from "./PhaserCanvas";
import { useInView } from "react-intersection-observer";
import { ButtonVariant, CanvasSize, PrimaryColor } from "../../utils";
import { usePetStateStore } from "../../hooks/usePetStateStore";
import { IconPlus, IconTrash } from "@tabler/icons-react";

function PetCard({ btnLabel, pet, btnFunction, type }: IPetCardProps) {
    const { petStates, storeDictPetStates } = usePetStateStore();
    const availableStates = petStates[pet.name] ?? Object.keys(pet.states).map(state => (state));
    const randomState = availableStates[Math.floor(Math.random() * availableStates.length)];
    const [playState, setPlayState] = useState<string>(randomState);
    const { ref, inView } = useInView();

    // save pet to memoization so that we can use it later to save some resource
    useEffect(() => {
        if (!petStates.hasOwnProperty(pet.name)) {
            storeDictPetStates(pet.name, availableStates);
        }
    }, []);

    return (
        <>
            {/* if the pet is currently in user viewport, show it, otherwise destroy its dom because it take a lot of resource */}
            <Box
                id={`petCard-id-${pet.id ?? pet.name}`}
                ref={ref}
                className="max-w-[13rem] min-w-[13rem] overflow-hidden rounded-[var(--roam-wobble-a)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] shadow-[var(--roam-shadow)] transition-[transform,box-shadow] duration-[120ms] ease-in even:rounded-[var(--roam-wobble-b)] hover:translate-y-[-2px] hover:rotate-[-0.5deg] hover:shadow-[5px_7px_0_rgba(32,38,47,0.18)]"
                key={pet.id ?? pet.name}
            >
                {inView ?
                    <Box>
                        <PhaserCanvas pet={pet} playState={playState} key={pet.id} />
                        <Box p={"md"}>
                            <Title order={4} className="truncate text-center !font-note !text-xl !font-normal !text-[var(--roam-ink)]">{pet.name}</Title>
                            {/* for now use native select because select in mantine 7 is very slow, let see until further update */}
                            {/* <Select
                                allowDeselect={false}
                                checkIconPosition={"right"}
                                my={"md"}
                                maxDropdownHeight={210}
                                placeholder="Pick one"
                                defaultValue={playState}
                                onChange={setPlayState as any}
                                pointer
                                key={pet.id ?? pet.name}
                                data={availableStates}
                            /> */}
                            <NativeSelect
                                my={"xs"}
                                defaultValue={playState}
                                onChange={(event) => setPlayState(event.currentTarget.value)}
                                key={pet.id ?? pet.name}
                                data={availableStates}
                            />
                            <Group>
                                <Button
                                    variant={ButtonVariant}
                                    fullWidth
                                    onClick={btnFunction}
                                    color={PrimaryColor}
                                    leftSection={type === PetCardType.Add ?
                                        <IconPlus /> :
                                        <IconTrash />
                                    }
                                >
                                    {btnLabel}
                                </Button>
                            </Group>
                        </Box>
                    </Box>
                    :
                    <Box style={{
                        height: CanvasSize,
                        width: CanvasSize,
                    }}>
                    </Box>
                }
            </Box >
        </>
    )
};

export default memo(PetCard);
