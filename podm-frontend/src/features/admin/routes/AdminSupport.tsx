import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import SupportTicketsPanel from '../components/SupportTicketsPanel';

export default function AdminSupport() {
  const data = useOutletContext<AdminData>();
  return <SupportTicketsPanel tickets={data.supportTickets} />;
}
