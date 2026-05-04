import { useEffect, useRef, useState } from 'react';
import { BurgerButton } from '../ui/BurgerButton';
import { Logo } from '../ui/Logo';
import { useMediaQuery } from 'react-responsive';
import { UserbarMenu } from './UserbarMenu';
import { useUser } from '@/hooks/useUser';
import { Bell, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import classNames from 'classnames';
import { signOut } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';

export const Userbar = () => {
  const name = 'Anna Kowalska';
  const { data: user } = useUser();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdown, setDropdown] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const getInitials = () => {
    const words = name.split(' ');

    return `${words[0].charAt(0)}${words[1].charAt(0)}`;
  };

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
    const close = (e: MouseEvent) => {
      if (selectRef.current && selectRef.current.contains(e.target as Node)) {
        return;
      }

      setDropdown(false);
    };

    document.addEventListener('mousedown', close);

    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, []);

  return (
    <>
      <div className="flex items-center z-9 min-[426px]:h-[64px] h-[50px] bg-white border-b border-icon shrink-0">
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
        <div className="ml-[auto] h-full flex items-center gap-[10px]">
          <Link
            to="/dashboard/notifications"
            className="relative flex items-center h-full px-[10px] cursor-pointer"
          >
            <div className="absolute min-[426px]:top-[20px] top-[14px] right-[12px] w-[6px] h-[6px] bg-alert rounded-full"></div>
            <Bell className="text-black" size={20} />
          </Link>
          <div className="relative h-full" ref={selectRef}>
            <div
              className="cursor-pointer flex items-center gap-[8px] h-full md:pr-[32px] pr-[15px]"
              onClick={() => setDropdown(!dropdown)}
            >
              <div className="w-[32px] h-[32px] bg-secondary rounded-full flex items-center justify-center">
                <p className="text-[12px] font-regular text-white">{getInitials()}</p>
              </div>
              <div className="max-[426px]:hidden">
                <p className="text-[14px] font-regular text-black">{name}</p>
                <p className="text-[12px]">{user.email}</p>
              </div>
            </div>
            <div
              className={classNames(
                'shadow-[0_2px_7px_0_rgba(0,0,0,0.1)] min-[426px]:w-full w-fit flex flex-col gap-[8px] p-[4px] absolute min-[426px]:top-[64px] top-[50px] right-0 bg-white',
                {
                  hidden: !dropdown,
                },
              )}
            >
              <Link
                onClick={() => setDropdown(false)}
                to="/dashboard/settings"
                className="hover:bg-bg-section p-[8px] flex items-center gap-[8px]"
              >
                <Settings size={22} className="text-black" />
                <p className="font-regular text-[14px] text-black">Ustawienia</p>
              </Link>
              <button
                onClick={logout}
                type="button"
                className="cursor-pointer flex items-center gap-[8px] hover:bg-bg-section p-[8px]"
              >
                <LogOut size={22} className="text-alert" />
                <p className="font-regular text-[14px] text-alert">Wyloguj</p>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isTabletOrMobile && <UserbarMenu value={isOpen} onClick={setIsOpen} />}
    </>
  );
};
