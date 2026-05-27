import { Text, UnstyledButton } from '@mantine/core';
import { memo } from 'react';
import { SettingsSidebarNavItemProps } from '../types';
import clsx from 'clsx';

function SettingsSidebarNavItem({ Icon, label, active, compact, onSelect }: SettingsSidebarNavItemProps) {

  return (
    <UnstyledButton
      onClick={onSelect}
      className={clsx(
        'flex min-h-[46px] w-full items-center gap-2.5 rounded-[var(--roam-wobble-a)] border-2 border-solid border-transparent px-3 py-[9px] font-note text-[var(--roam-ink)] transition-transform duration-[120ms] ease-in',
        {
          'justify-center !px-0 py-2.5': compact,
          'rotate-[-1.2deg] border-[var(--roam-ink)] bg-[var(--roam-peach-soft)] text-[var(--roam-ink)] shadow-[2px_3px_0_rgba(32,38,47,0.16)]': active,
        },
      )}
      title={compact ? label : undefined}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center text-current">{Icon}</span>
      <Text size="md" fw={500} className={clsx('whitespace-nowrap !font-note !text-lg', { hidden: compact })} aria-hidden={compact}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

export default memo(SettingsSidebarNavItem);
