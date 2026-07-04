import { useSettingsStore } from '../store/settingsStore';
import { getTheme } from '../theme';
import { useMemo } from 'react';

export function useSettings() {
  const store = useSettingsStore();

  const theme = useMemo(
    () => getTheme(store.settings.theme),
    [store.settings.theme]
  );

  return {
    ...store,
    muiTheme: theme,
  };
}
