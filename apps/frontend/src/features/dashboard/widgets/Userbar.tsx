import { useEffect, useMemo, useRef, useState } from 'react';
import { BurgerButton } from '../ui/BurgerButton';
import { Logo } from '../ui/Logo';
import { useMediaQuery } from 'react-responsive';
import { UserbarMenu } from './UserbarMenu';
import { useUser } from '@/hooks/useUser';
import { Bell, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import classNames from 'classnames';
import { signOut } from '@/features/auth/auth.api';
import { queryClient } from '@/lib/queryClient';
import { ThemeToggle } from '@/hooks/useTheme';
import { RemindersDropdown } from './RemindersDropdown';
import { useVehicles } from '@/hooks/useVehicles';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';

export const Userbar = () => {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdown, setDropdown] = useState<'settings' | 'alerts' | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const { data: vehiclesResponse } = useVehicles();
  const vehicles = vehiclesResponse?.items ?? [];

  const hasUrgentAlerts = useMemo(() => {
    return vehicles.some((car) => {
      const dates = [car.technicalInspectionExpiry, car.ocExpiry, car.acExpiry];
      return dates.some((dateStr) => {
        if (!dateStr) return false;
        const { days, isPast } = calculateDaysToDate(dateStr);
        return isPast || days <= 30;
      });
    });
  }, [vehicles]);

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

  // 1. Złożenie pełnego imienia i nazwiska
  const userFullName = useMemo(() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.name) {
      return user.name;
    }
    // Fallback
    return user?.email?.split('@')[0] ?? 'Użytkownik';
  }, [user]);

  // 2. Generowanie inicjałów
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.name) {
      const parts = user.name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() ?? 'U';
  };

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
        <div className="ml-[auto] h-full flex items-center gap-4">
          <ThemeToggle />

          {/* ALERTY / DROPDOWN */}
          <div className="relative h-full " ref={alertsRef}>
            <div
              className="relative cursor-pointer px-4 h-full flex items-center justify-center"
              onClick={() => setDropdown(dropdown === 'alerts' ? null : 'alerts')}
            >
              <div className="relative">
                {hasUrgentAlerts && (
                  <div className="absolute -top-[2px] right-[2px] w-[8px] h-[8px] bg-alert rounded-full animate-pulse" />
                )}
                <Bell className="text-content-primary" size={20} />
              </div>
            </div>

            <RemindersDropdown isOpen={dropdown === 'alerts'} onClose={() => setDropdown(null)} />
          </div>

          {/* USTAWIENIA UŻYTKOWNIKA */}
          <div className="relative h-full" ref={settingsRef}>
            <div
              onClick={() => setDropdown(dropdown === 'settings' ? null : 'settings')}
              className="cursor-pointer flex items-center gap-[8px] h-full md:pr-[32px] pr-[15px]"
            >
              {/* AVATAR Z INICJAŁAMI  */}
              <div className="w-[32px] h-[32px] bg-secondary rounded-full flex items-center justify-center shrink-0">
                <p className="text-[12px] font-bold text-white">{getInitials()}</p>
              </div>

              {/* DANE UŻYTKOWNIKA */}
              <div className="max-[426px]:hidden flex flex-col">
                <p className="text-[14px] font-bold text-content-primary leading-tight">
                  {userFullName}
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
