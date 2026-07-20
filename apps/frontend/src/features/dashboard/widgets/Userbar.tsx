import { useEffect, useRef, useState } from 'react';
import { BurgerButton } from '../ui/BurgerButton';
import { Logo } from '../ui/Logo';
import { useMediaQuery } from 'react-responsive';
import { UserbarMenu } from './UserbarMenu';
import { useUser } from '@/hooks/useUser';
import { Bell, LogOut, Settings, Wrench } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import classNames from 'classnames';
import { signOut } from '@/features/auth/auth.api';
import { queryClient } from '@/lib/queryClient';
import { ThemeToggle } from '@/hooks/useTheme';
import { DaysAmount } from '../ui/DaysAmount';
import { getInitials } from '@/utils/getInitials';

export const Userbar = () => {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdown, setDropdown] = useState<'settings' | 'alerts' | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

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
        <div className="ml-[auto] h-full flex items-center">
          <ThemeToggle />

          <div className="relative h-full" ref={alertsRef}>
            <div
              className="relative cursor-pointer px-4 h-full flex items-center justify-center"
              onClick={() => setDropdown(dropdown === 'alerts' ? null : 'alerts')}
            >
              <div className="relative">
                <div className="absolute -top-[2px] right-[2px] w-[6px] h-[6px] bg-alert rounded-full"></div>
                <Bell className="text-content-primary" size={20} />
              </div>
            </div>

            <div
              className={classNames(
                'shadow-[0_2px_7px_0_rgba(0,0,0,0.1)] flex flex-col gap-[8px] p-[16px] sm:absolute min-[426px]:top-[64px] top-[50px] right-0 bg-bg-card min-w-[320px] sm:w-fit w-screen fixed',
                {
                  hidden: dropdown !== 'alerts',
                },
              )}
            >
              <div className="border-b-2 border-icon pb-[6px]">
                <h3 className="text-[12px] font-bold">Alerty floty</h3>
                <p className="text-[10px] font-normal">3 terminy w ciągu 30 dni</p>
              </div>
              <div className="">
                <div className="flex items-start gap-[16px] py-[10px] border-b-2 border-icon">
                  <div className="flex items-center justify-center w-[26px] h-[26px] rounded-[3px] bg-alert-bg-icon">
                    <Wrench className="text-alert" size={14} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[12px] font-medium text-dark">Przegląd techniczy</p>
                    <p className="text-[10px] font-normal">Ford Transit - GD 55432</p>
                    <p className="text-[10px] font-normal">4 cze 2026</p>
                  </div>
                  <DaysAmount days={3} className="ml-auto" />
                </div>
              </div>
              <div className="">
                <Link
                  onClick={() => setDropdown(null)}
                  to="/dashboard/notifications"
                  className="text-[12px] font-medium text-info"
                >
                  Zobacz wszystkie powiadomienia
                </Link>
              </div>
            </div>
          </div>

          <div className="relative h-full" ref={settingsRef}>
            <div
              onClick={() => setDropdown(dropdown === 'settings' ? null : 'settings')}
              className="cursor-pointer flex items-center gap-[8px] h-full md:pr-[32px] pr-[15px]"
            >
              <div className="w-[32px] h-[32px] bg-secondary rounded-full flex items-center justify-center">
                <p className="text-[12px] font-normal text-white">
                  {getInitials(user.firstName, user.lastName)}
                </p>
              </div>
              <div className="max-[426px]:hidden">
                <p className="text-[14px] font-normal text-content-primary">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[12px]">{user.email}</p>
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
