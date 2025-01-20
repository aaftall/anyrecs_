import React from 'react';
import { Outlet } from 'react-router-dom';
import UserProfileMenu from './UserProfileMenu';

export default function Layout() {
  return (
    <div className="relative">
      <UserProfileMenu />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
