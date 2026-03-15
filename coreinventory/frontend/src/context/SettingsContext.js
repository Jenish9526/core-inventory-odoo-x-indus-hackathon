import React, { createContext, useContext, useState, useEffect } from 'react';

const DEFAULTS = {
  // Appearance
  theme: 'dark',
  sidebarCollapsed: false,
  compactMode: false,
  // Notifications
  notifLowStock: true,
  notifStockUpdates: true,
  notifDeliveries: true,
  notifSound: false,
  // Data & Display
  defaultPageSize: 20,
  dateFormat: 'MM/DD/YYYY',
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  // Dashboard
  autoRefresh: true,
  refreshInterval: 30,
  showLowStockBanner: true,
};

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ci_settings'));
      return { ...DEFAULTS, ...saved };
    } catch { return DEFAULTS; }
  });

  useEffect(() => {
    localStorage.setItem('ci_settings', JSON.stringify(settings));
  }, [settings]);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const reset = () => setSettings(DEFAULTS);

  return (
    <SettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
