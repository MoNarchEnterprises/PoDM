import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminData } from '../AdminPanel';
import ContentModerationPanel from '../components/ContentModerationPanel';

export default function AdminContent() {
  const data = useOutletContext<AdminData>();
  return <ContentModerationPanel flaggedContent={data.flaggedContent} />;
}
