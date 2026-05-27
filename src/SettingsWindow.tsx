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
        <Box className="h-screen bg-[var(--roam-paper)] text-[var(--roam-ink)] [background-image:linear-gradient(var(--roam-grid)_1px,transparent_1px),linear-gradient(90deg,var(--roam-grid)_1px,transparent_1px)] [background-size:24px_24px]">
          <Box className={clsx('grid h-screen', isNavCompact ? 'grid-cols-[78px_1fr]' : 'grid-cols-[236px_1fr]')}>
            <Box component="aside" className="flex flex-col gap-2 border-r-[3px] border-[var(--roam-ink)] bg-[var(--roam-paper-2)] px-3.5 py-[18px] max-[720px]:px-2.5 max-[720px]:py-4">
              <Box className={clsx('flex items-center gap-2.5 px-1 pb-4', { 'justify-center px-0': isNavCompact })}>
                <img className="h-[38px] w-[38px] rounded-[12px_8px_13px_9px/8px_13px_9px_12px] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] object-contain shadow-[2px_3px_0_rgba(32,38,47,0.16)]" src="/app-icon.png" alt="" />
                <Box className={clsx('flex flex-col leading-none', { hidden: isNavCompact })}>
                  <span className="font-hand text-[31px] font-bold rotate-[-2deg]">Roam</span>
                </Box>
              </Box>
              <button
                className="inline-flex min-h-[38px] w-full cursor-pointer items-center justify-center rounded-[var(--roam-wobble-b)] border-2 border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] text-[var(--roam-ink)] shadow-[2px_3px_0_rgba(21,27,45,0.14)] transition-[transform,background] duration-[120ms] ease-in hover:translate-y-[-1px] hover:rotate-[-0.6deg] hover:bg-[var(--roam-peach-soft)]"
                type="button"
                onClick={handleToggleNavigation}
                aria-label={isNavCompact ? t('Expand navigation') : t('Collapse navigation')}
                title={isNavCompact ? t('Expand navigation') : t('Collapse navigation')}
              >
                {isNavCompact ? <IconChevronRight size={19} /> : <IconChevronLeft size={19} />}
              </button>
              <SettingsSidebarNav activeTab={normalizedTab} tabs={settingsTabs} compact={isNavCompact} />
              <a
                className={clsx('mt-auto flex items-baseline justify-center gap-1 whitespace-nowrap px-1.5 pb-0.5 pt-3.5 text-center font-note text-sm text-[var(--roam-muted)] no-underline transition-[color,transform] duration-[120ms] ease-in hover:rotate-[-1.2deg] hover:text-[var(--roam-brown)]', { hidden: isNavCompact })}
                href="https://beaudelaire.ca"
                onClick={handlePresentedByClick}
              >
                Presented by <b className="font-hand text-lg font-bold text-[var(--roam-ink)]">Beaudelaire</b>
              </a>
            </Box>

            <Box
              component="main"
              className={clsx(
                'relative min-h-0 bg-transparent before:pointer-events-none before:fixed before:bottom-0 before:top-0 before:w-0.5 before:bg-[rgba(168,102,78,0.42)] before:content-[""]',
                isNavCompact ? 'before:left-[104px]' : 'before:left-[262px]',
              )}
            >
              <Box className="flex h-full w-full flex-col gap-6 overflow-y-auto py-[34px] pl-12 pr-10 pb-[42px] max-[720px]:px-[18px] max-[720px]:py-7" key={normalizedTab}>
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
