import { getUser } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';
import { Sidebar } from '@/modules/dashboard/shared/Sidebar';
import { Userbar } from '@/modules/dashboard/shared/Userbar';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useMediaQuery } from 'react-responsive';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: ['me'],
      queryFn: getUser,
    });

    if (!user) {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

  return (
    <div className="flex h-full">
      {!isTabletOrMobile && <Sidebar />}
      <div className="flex flex-col w-full">
        <Userbar />

        <div className="flex-1 bg-bg-section xl:px-[64px] md:px-[32px] py-[32px] px-[15px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
