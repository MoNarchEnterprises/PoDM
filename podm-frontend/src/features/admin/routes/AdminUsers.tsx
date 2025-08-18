import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import UserManagementPanel from '../components/UserManagementPanel';

export default function AdminUsers() {
  const data = useOutletContext<AdminData>();
  return <UserManagementPanel users={data.users} />;
}
