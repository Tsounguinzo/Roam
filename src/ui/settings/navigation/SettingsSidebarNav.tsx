import SettingsSidebarNavItem from './SettingsSidebarNavItem';
import { memo, useCallback } from 'react';
import { SettingsSidebarNavProps } from '../types';
import { useSettingTabStore } from '../../../hooks/useSettingTabStore';
import { useSearchParams } from 'react-router-dom';

function SettingsSidebarNav({ activeTab, tabs }: SettingsSidebarNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActiveTab } = useSettingTabStore();

  const handleSetTab = useCallback((index: number) => {
    setActiveTab(index);

    // update url search params
    searchParams.set('tab', index.toString());
    setSearchParams(searchParams);
  }, [searchParams, setActiveTab, setSearchParams]);

  const sections = tabs.map((tabDefinition) => (
    <SettingsSidebarNavItem
      label={tabDefinition.label}
      Icon={tabDefinition.Icon}
      key={tabDefinition.label}
      active={tabDefinition.tab === activeTab}
      onSelect={() => handleSetTab(tabDefinition.tab)}
    />
  ));

  return <>{sections}</>;
}

export default memo(SettingsSidebarNav);
