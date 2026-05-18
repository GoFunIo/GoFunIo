import { getUser } from '@/features/auth/auth.api';
import { Sidebar } from '@/features/dashboard/widgets/Sidebar';
import { Userbar } from '@/features/dashboard/widgets/Userbar';
import { useUser } from '@/hooks/useUser';
import { queryClient } from '@/lib/queryClient';
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
  const { data: user, isLoading } = useUser();
  console.log(user);
  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

  return (
    <div className="flex h-screen">
      {!isTabletOrMobile && <Sidebar />}
      <div className="flex flex-col w-full h-screen overflow-hidden">
        <Userbar />

        <div className="flex-1 overflow-auto bg-bg-section xl:px-[64px] md:px-[32px] py-[32px] px-[15px] flex flex-col md:gap-[24px] gap-[15px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
