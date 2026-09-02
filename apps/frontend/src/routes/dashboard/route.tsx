import { getUser } from '@/features/dashboard/api/user.api';
import { useDelayedLoading } from '@/features/dashboard/hooks/useDelayedLoading';
import { useNotificationStream } from '@/features/dashboard/hooks/useNotificationStream';
import { PageLoading } from '@/features/dashboard/widgets/PageLoading';
import { Sidebar } from '@/features/dashboard/widgets/Sidebar';
import { Userbar } from '@/features/dashboard/widgets/Userbar';
import { queryClient } from '@/lib/queryClient';
import { setScrollRoot } from '@/utils/scrollRoot';
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useRouterState,
} from '@tanstack/react-router';
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

  useNotificationStream();

  useEffect(() => {
    setScrollRoot(scrollRef);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [location.pathname]);

  const isPending = useRouterState({
    select: (state) => {
      if (state.status !== 'pending') {
        return false;
      }

      const current = state.location.pathname;
      const next = state.resolvedLocation?.pathname;

      if (!next) {
        return false;
      }

      if (current.startsWith('/dashboard/settings') && next.startsWith('/dashboard/settings')) {
        return false;
      }

      return true;
    },
  });
  const showLoading = useDelayedLoading(isPending);

  return (
    <div className="flex h-screen">
      {!isTabletOrMobile && <Sidebar />}
      <div className="flex flex-col w-full h-screen overflow-hidden">
        <Userbar />

        <div
          className="scrollbar-dashboard flex-1 overflow-auto bg-bg-section xl:px-[64px] md:px-[32px] py-[32px] px-[15px] flex flex-col md:gap-[24px] gap-[15px]"
          ref={scrollRef}
        >
          {showLoading ? <PageLoading /> : <Outlet />}
        </div>
      </div>
    </div>
  );
}
