import { Sidebar } from '@/modules/dashboard/shared/Sidebar';
import { Userbar } from '@/modules/dashboard/shared/Usebar';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col w-full">
        <Userbar />

        <div className="flex-1 bg-bg-section px-[64px] py-[32px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
