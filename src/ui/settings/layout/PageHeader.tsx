import { Box, Text } from "@mantine/core";
import { PageHeaderProps } from "../types";
import classes from "./PageHeader.module.css";

function PageHeader({ title, description }: PageHeaderProps) {
    return (
        <Box>
            <Text className={classes.title}>{title}</Text>
            <Box>
                <Text className={classes.description}>
                    {description}
                </Text>
            </Box>
        </Box>
    )
}

export default PageHeader;
