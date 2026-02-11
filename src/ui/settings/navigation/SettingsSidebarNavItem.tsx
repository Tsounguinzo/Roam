import { Text, UnstyledButton } from '@mantine/core';
import { memo } from 'react';
import { SettingsSidebarNavItemProps } from '../types';
import clsx from 'clsx';
import classes from "./SettingsSidebarNavItem.module.css";

function SettingsSidebarNavItem({ Icon, label, active, onSelect }: SettingsSidebarNavItemProps) {

  return (
    <UnstyledButton
      onClick={onSelect}
      className={clsx(classes.link, { [classes.active]: active })}
    >
      <span className={classes.icon}>{Icon}</span>
      <Text size="md" fw={500} className={classes.label}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

export default memo(SettingsSidebarNavItem);
