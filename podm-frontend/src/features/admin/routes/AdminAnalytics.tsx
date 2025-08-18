import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';

export default function AdminAnalytics() {
  const data = useOutletContext<AdminData>();
  return <AnalyticsPanel data={data.analytics} />;
}
