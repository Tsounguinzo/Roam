import { Box, Text } from "@mantine/core";
import { PageHeaderProps } from "../types";

function PageHeader({ title, description }: PageHeaderProps) {
    return (
        <Box>
            <Text className="!font-hand !text-[42px] !font-bold !leading-none !tracking-normal !text-[var(--roam-ink)]">{title}</Text>
            <Box>
                <Text className="mt-[5px] !font-note !text-lg !leading-[1.45] !text-[var(--roam-muted)] [&_a:hover]:underline [&_a]:text-[var(--roam-blue)] [&_a]:underline [&_a]:decoration-wavy">
                    {description}
                </Text>
            </Box>
        </Box>
    )
}

export default PageHeader;
