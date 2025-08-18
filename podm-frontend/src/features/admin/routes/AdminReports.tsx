import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import ReportsPanel from '../components/ReportsPanel';

export default function AdminReports() {
  const data = useOutletContext<AdminData>();
  return <ReportsPanel reports={data.reports} />;
}
