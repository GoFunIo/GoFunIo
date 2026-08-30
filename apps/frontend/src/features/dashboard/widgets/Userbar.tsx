import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { Bell, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import classNames from 'classnames';
import { ThemeToggle } from '@/hooks/useTheme';
import { useUser } from '../hooks/user.hooks';
import { useNotificationCenterSummary } from '@/features/dashboard/hooks/notificationCenter.hooks';

import { BurgerButton } from '../ui/BurgerButton';
import { Logo } from '../ui/Logo';
import { UserbarMenu } from './UserbarMenu';
import { signOut } from '@/features/auth/auth.api';
import { queryClient } from '@/lib/queryClient';
import { getInitials } from '@/utils/getInitials';
import { RemindersDropdown } from './RemindersDropdown';
import { getUserFullName } from '@/utils/getUserFullName';

export const Userbar = () => {
  const navigate = useNavigate();
  const settingsRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  const { data: user } = useUser();
  const { data: summary } = useNotificationCenterSummary();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdown, setDropdown] = useState<'settings' | 'alerts' | null>(null);
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

  //  const hasUnreadNotifications = (summary?.unreadNotificationCount ?? 0) > 0;

  const unreadCount = summary?.unreadNotificationCount ?? 0;
  const unreadBadgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  const logout = async () => {
    try {
      await signOut();
      queryClient.setQueryData(['me'], null);
      navigate({ to: '/login' });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (settingsRef.current?.contains(target) || alertsRef.current?.contains(target)) {
        return;
      }

      setDropdown(null);
    };

    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  return (
    <>
      <div className="flex items-center z-9 min-[426px]:h-[64px] h-[50px] bg-bg-card border-b border-icon shrink-0">
        {/* LEWA STRONA (MOBILE / TABLET LOGO) */}
        {isTabletOrMobile && (
          <div className="md:ml-[32px] ml-[15px] flex items-center h-full gap-[15px]">
            <Logo />
            <BurgerButton
              className="overflow-hidden w-[30px]"
              value={isOpen}
              onClick={setIsOpen}
              hasLabel={false}
            />
          </div>
        )}

        {/* PRAWA  STRONA user+ ikonki  */}
        <div className="ml-[auto] h-full flex items-center gap-4">
          {user?.role && (
            <span className="text-[10px] text-content-primary font-semibold px-4 py-2 rounded-md uppercase tracking-wider bg-bg-section shrink-0">
              {user.role}
            </span>
          )}

          <div className="p-2 rounded-lg hover:bg-bg-section transition-colors cursor-pointer flex items-center justify-center">
            <ThemeToggle />
          </div>

          {/* ALERTY / DROPDOWN */}
          <div className="relative flex items-center h-full" ref={alertsRef}>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-bg-section transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
              onClick={() => setDropdown(dropdown === 'alerts' ? null : 'alerts')}
              aria-label="Alerts"
            >
              {/* <div className="relative flex items-center justify-center">
                {hasUnreadNotifications && (
                  <div className="absolute -top-[2px] -right-[2px] w-[8px] h-[8px] bg-alert rounded-full animate-pulse" />
                )}
                <Bell className="text-content-primary" size={20} />
              </div> */}

              <div className="relative flex items-center justify-center">
                {unreadBadgeText && (
                  <span className="absolute -top-[6px] -right-[6px] min-w-[16px] h-[16px] px-[3px] bg-alert text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadBadgeText}
                  </span>
                )}
                <Bell className="text-content-primary" size={20} />
              </div>
            </button>

            <RemindersDropdown isOpen={dropdown === 'alerts'} onClose={() => setDropdown(null)} />
          </div>

          {/* USTAWIENIA UŻYTKOWNIKA */}
          <div className="relative flex items-center  h-full" ref={settingsRef}>
            <div
              onClick={() => setDropdown(dropdown === 'settings' ? null : 'settings')}
              className="cursor-pointer flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-section transition-colors md:mr-8 mr-[15px]"
            >
              {/* AVATAR Z INICJAŁAMI  */}
              <div className="w-[32px] h-[32px] bg-secondary rounded-full flex items-center justify-center shrink-0">
                <p className="text-[12px] font-bold text-white">
                  {getInitials(user?.firstName, user?.lastName, user?.email)}
                </p>
              </div>

              {/* DANE UŻYTKOWNIKA */}
              <div className="max-[426px]:hidden flex flex-col">
                <p className="text-[14px] font-bold text-content-primary leading-tight">
                  {getUserFullName(user?.firstName, user?.lastName, user?.email)}
                </p>
                <p className="text-[12px] text-content-secondary leading-tight mt-0.5">
                  {user?.email}
                </p>
              </div>
            </div>
            <div
              className={classNames(
                'shadow-[0_2px_7px_0_rgba(0,0,0,0.1)] min-[426px]:w-full w-fit flex flex-col gap-[8px] p-[4px] absolute min-[426px]:top-[64px] top-[50px] right-0 bg-bg-card',
                {
                  hidden: dropdown !== 'settings',
                },
              )}
            >
              <Link
                onClick={() => setDropdown(null)}
                to="/dashboard/settings"
                className="hover:bg-bg-section p-[8px] flex items-center gap-[8px]"
              >
                <Settings size={22} className="text-content-primary" />
                <p className="font-normal text-[14px] text-content-primary">Ustawienia</p>
              </Link>
              <button
                onClick={logout}
                type="button"
                className="cursor-pointer flex items-center gap-[8px] hover:bg-bg-section p-[8px]"
              >
                <LogOut size={22} className="text-alert" />
                <p className="font-normal text-[14px] text-alert">Wyloguj</p>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isTabletOrMobile && <UserbarMenu value={isOpen} onClick={setIsOpen} />}
    </>
  );
};
