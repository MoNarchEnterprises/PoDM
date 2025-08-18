import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import DashboardPanel from '../components/DashboardPanel';

export default function AdminDashboard() {
  const data = useOutletContext<AdminData>();
  return <DashboardPanel data={data.dashboard} />;
}
