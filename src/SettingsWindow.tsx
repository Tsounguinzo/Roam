import { Box } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCat,
  IconSettings,
  IconBuildingStore,
  IconPaw,
} from '@tabler/icons-react';
import SettingsSidebarNav from './ui/settings/navigation/SettingsSidebarNav';
import { useTranslation } from 'react-i18next';
import { useSettingStore } from './hooks/useSettingStore';
import { SettingsTabDefinition, SettingsTabId } from './types/ISetting';
import { memo, useEffect, useMemo, useState, type MouseEvent } from 'react';
import clsx from 'clsx';
import MyPetsTab from './ui/settings/tabs/MyPetsTab';
import PetStoreTab from './ui/settings/tabs/PetStoreTab';
import PreferencesTab from './ui/settings/tabs/PreferencesTab';
import { useSettingTabStore } from './hooks/useSettingTabStore';
import PageHeader from './ui/settings/layout/PageHeader';
import { Notifications } from '@mantine/notifications';
import useQueryParams from './hooks/useQueryParams';
import { ModalsProvider } from '@mantine/modals';
import useInit from './hooks/useInit';
import { checkForUpdate } from './utils/update';
import AddCustomPetTab from './ui/settings/tabs/AddCustomPetTab';
import { open } from '@tauri-apps/plugin-shell';
import { isTauriRuntime } from './utils/runtime';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import classes from './SettingsWindow.module.css';

function SettingsWindow() {
  const { language, pets, defaultPet } = useSettingStore();
  const { t } = useTranslation();
  const queryParams = useQueryParams();
  const { activeTab, setActiveTab } = useSettingTabStore();
  const [isNavCompact, setIsNavCompact] = useState(() => localStorage.getItem('settings-nav-compact') === 'true');

  // check for update when open settings window
  useInit(() => {
    checkForUpdate();
  });

  useEffect(() => {
    // set active tab from url search params, by doing this user can refresh the page and still get the same tab
    if (queryParams.has('tab') && Number(queryParams.get('tab')) !== activeTab) {
      setActiveTab(Number(queryParams.get('tab')));
    }
  }, [activeTab, queryParams, setActiveTab]);

  const settingsTabs: SettingsTabDefinition[] = useMemo(() => ([
    {
      Component: MyPetsTab,
      title: t("My Pets", { totalPets: pets.length }),
      description: t("Meet your furry friend, a loyal companion who loves to play and cuddle"),
      Icon: <IconCat size="1rem" />,
      label: t('My Pet'),
      tab: SettingsTabId.MyPets,
    },
    {
      Component: PetStoreTab,
      title: t("Pet Shop Total", { totalPets: defaultPet.length }),
      description: t("Browse wide selection of adorable pets, find your perfect companion today!"),
      Icon: <IconBuildingStore size="1rem" />,
      label: t('Pet Shop'),
      tab: SettingsTabId.PetStore,
    },
    {
      Component: AddCustomPetTab,
      title: t("Add Custom Pet"),
      description: t("Add your custom pet to your computer and watch them bring kawaii cuteness to your digital world!"),
      Icon: <IconPaw size="1rem" />,
      label: t('Add Custom Pet'),
      tab: SettingsTabId.AddCustomPet,
    },
    {
      Component: PreferencesTab,
      title: t("Setting Preferences"),
      description: t("Choose what u desire, do what u love"),
      Icon: <IconSettings size="1rem" />,
      label: t('Settings'),
      tab: SettingsTabId.Preferences,
    },
  ]), [defaultPet.length, language, pets.length, t]);
  const normalizedTab = settingsTabs[activeTab] ? activeTab : SettingsTabId.MyPets;
  const CurrentSettingTab = settingsTabs[normalizedTab].Component;
  const handlePresentedByClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const url = 'https://beaudelaire.ca';

    if (isTauriRuntime()) {
      open(url);
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleToggleNavigation = () => {
    setIsNavCompact((currentValue) => {
      const nextValue = !currentValue;
      localStorage.setItem('settings-nav-compact', String(nextValue));
      return nextValue;
    });
  };

  return (
    <>
      <Notifications position={'top-center'} limit={2} />
      <ModalsProvider>
        <Box className={classes.viewport}>
          <Box className={clsx(classes.window, { [classes.compact]: isNavCompact })}>
            <Box component="aside" className={classes.sidebar}>
              <Box className={classes.brand}>
                <img className={classes.brandLogo} src="/app-icon.png" alt="" />
                <Box className={classes.brandText}>
                  <span>Roam</span>
                </Box>
              </Box>
              <button
                className={classes.navToggle}
                type="button"
                onClick={handleToggleNavigation}
                aria-label={isNavCompact ? t('Expand navigation') : t('Collapse navigation')}
                title={isNavCompact ? t('Expand navigation') : t('Collapse navigation')}
              >
                {isNavCompact ? <IconChevronRight size={19} /> : <IconChevronLeft size={19} />}
              </button>
              <SettingsSidebarNav activeTab={normalizedTab} tabs={settingsTabs} compact={isNavCompact} />
              <a
                className={classes.presentedBy}
                href="https://beaudelaire.ca"
                onClick={handlePresentedByClick}
              >
                Presented by <b>Beaudelaire</b>
              </a>
            </Box>

            <Box component="main" className={classes.main}>
              <Box className={classes.mainScroll} key={normalizedTab}>
                <PageHeader title={settingsTabs[normalizedTab].title} description={settingsTabs[normalizedTab].description} />
                <CurrentSettingTab />
              </Box>
            </Box>
          </Box>
        </Box>
      </ModalsProvider>
    </>
  );
}

export default memo(SettingsWindow);
