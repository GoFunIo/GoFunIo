import { getUser } from '@/features/auth/auth.api';
import { Sidebar } from '@/features/dashboard/widgets/Sidebar';
import { Userbar } from '@/features/dashboard/widgets/Userbar';
import { queryClient } from '@/lib/queryClient';
import { setScrollRoot } from '@/utils/scrollRoot';
import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setScrollRoot(scrollRef);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [location.pathname]);

  return (
    <div className="flex h-screen">
      {!isTabletOrMobile && <Sidebar />}
      <div className="flex flex-col w-full h-screen overflow-hidden">
        <Userbar />

        <div
          className="scrollbar-dashboard flex-1 overflow-auto bg-bg-section xl:px-[64px] md:px-[32px] py-[32px] px-[15px] flex flex-col md:gap-[24px] gap-[15px]"
          ref={scrollRef}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
