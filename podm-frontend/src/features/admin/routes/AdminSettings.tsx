import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import SettingsPanel from '../components/SettingsPanel';

export default function AdminSettings() {
  const data = useOutletContext<AdminData>();
  return <SettingsPanel admins={data.settings.admins} />;
}
