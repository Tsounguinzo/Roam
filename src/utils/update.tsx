import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { modals } from '@mantine/modals';
import Updater from '../ui/pop_up/Updater';
import { info, error } from "@tauri-apps/plugin-log";
import { ButtonVariant } from '.';
import i18next from 'i18next';
import { isTauriRuntime } from './runtime';

export const checkForUpdate = async () => {
  if (!isTauriRuntime()) return false;

  info('Checking for update');
  try {
    const manifest = await check()
    const shouldUpdate = manifest !== null;

    if (shouldUpdate) {
      modals.openConfirmModal({
        modalId: 'check-for-update',
        centered: true,
        title: i18next.t('Update available'),
        children: <Updater shouldUpdate={shouldUpdate} manifest={manifest} />,
        confirmProps: { variant: ButtonVariant },
        cancelProps: { variant: ButtonVariant, color: 'brand' },
        labels: { confirm: i18next.t('Yes'), cancel: i18next.t('No') },
        onConfirm: () => update(),
      });
    }

    info('Update check complete');
    return shouldUpdate;
  } catch (err) {
    error(err as string);
  }
}

export const update = async () => {
  if (!isTauriRuntime()) return;

  try {
    info('Installing update');
    const manifest = await check();
    await manifest?.downloadAndInstall((event) => {
      info(`Updater event: ${event.event}`);
    });
    info('Update installed, relaunching app');
    await relaunch()
  } catch (err) {
    error(err as string);
  }
}
