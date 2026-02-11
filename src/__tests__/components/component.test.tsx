import { describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "node:test";
import SettingsWindow from "../../SettingsWindow";

afterEach(() => {
    cleanup();
});

describe("SettingsWindow", () => {
    it("should be defined", () => {
        render(<SettingsWindow />);

        expect(screen).toBeDefined();
    });
});

// it("Should render pet card", async () => {
//     const pet: ISpriteConfig = defaultPet[0];

//     const petCardProps = {
//         btnLabel: "test",
//         pet: pet,
//         btnFunction: () => {
//             console.log("output from test");
//         },
//         type: PetCardType.Add,
//     }
//     render(<PetCard {...petCardProps} />);
//     expect(screen.getByText(pet.name)).toBeDefined();
// });
