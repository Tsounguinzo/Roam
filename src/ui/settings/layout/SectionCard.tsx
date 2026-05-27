import { Box, Text } from "@mantine/core";
import { type ReactNode } from "react";
import clsx from "clsx";

interface SectionCardProps {
    title?: ReactNode;
    description?: ReactNode;
    eyebrow?: ReactNode;
    className?: string;
    children: ReactNode;
}

function SectionCard({ title, description, eyebrow, className, children }: SectionCardProps) {
    return (
        <section className={clsx("settings-section-card", className)}>
            {(eyebrow || title || description) && (
                <Box className="mb-4">
                    {eyebrow && <Text className="settings-eyebrow">{eyebrow}</Text>}
                    {title && <Text className="settings-section-title">{title}</Text>}
                    {description && <Text className="settings-section-description">{description}</Text>}
                </Box>
            )}
            {children}
        </section>
    );
}

export default SectionCard;
