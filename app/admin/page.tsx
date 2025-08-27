'use client';

import dynamic from 'next/dynamic';

const AdminPageClient = dynamic(() => import('./page-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading Admin Panel...</div>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminPageClient />;
}