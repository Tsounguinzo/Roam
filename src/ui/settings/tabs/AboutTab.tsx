import { memo } from "react";
import { Anchor, Flex, Text } from "@mantine/core";
import { open } from "@tauri-apps/api/shell";

function AboutTab() {
    return (
        <Flex
            align={"center"}
            justify={"center"}
            direction={"column"}
            style={{
                width: "100%",
                height: "65%",
            }}
        >
            <Text fw={600}>A Beaudelaire Tsoungui Nzodoumkouo production</Text>
            <Anchor onClick={() => open("https://beaudelaire.ca")}>beaudelaire.ca</Anchor>
        </Flex>
    )
}

export default memo(AboutTab);
