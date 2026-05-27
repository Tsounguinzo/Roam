import { Text, UnstyledButton } from '@mantine/core';
import { memo } from 'react';
import { SettingsSidebarNavItemProps } from '../types';
import clsx from 'clsx';

function SettingsSidebarNavItem({ Icon, label, active, compact, onSelect }: SettingsSidebarNavItemProps) {

  return (
    <UnstyledButton
      onClick={onSelect}
      className={clsx('settings-nav-item', {
        'settings-nav-item-active': active,
        'settings-nav-item-compact': compact,
      })}
      title={compact ? label : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center text-current">{Icon}</span>
      <Text size="md" fw={active ? 600 : 500} className={clsx('whitespace-nowrap !font-note !text-lg', { hidden: compact })} aria-hidden={compact}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

export default memo(SettingsSidebarNavItem);
