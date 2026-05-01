import { useState } from 'react';
import { BurgerButton } from '../ui/BurgerButton';
import { Logo } from '../ui/Logo';
import { useMediaQuery } from 'react-responsive';
import { UserbarMenu } from './UserbarMenu';
import { useUser } from '@/hooks/useUser';
import { Bell } from 'lucide-react';

export const Userbar = () => {
  const name = 'Anna Kowalska';

  const getInitials = () => {
    const words = name.split(' ');

    return `${words[0].charAt(0)}${words[1].charAt(0)}`;
  };

  const { data: user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });
  console.log(user);
  return (
    <>
      <div className="flex items-center z-9 h-[64px] px-[20px] bg-white border-b border-icon shrink-0">
        {isTabletOrMobile && (
          <div className="flex items-center h-full gap-[15px]">
            <Logo />
            <BurgerButton
              className="overflow-hidden w-[30px]"
              value={isOpen}
              onClick={setIsOpen}
              hasLabel={false}
            />
          </div>
        )}
        <div className="ml-[auto] flex items-center gap-[20px]">
          <div className="relative">
            <div className="absolute top-0 right-[2px] w-[6px] h-[6px] bg-alert rounded-full"></div>
            <Bell className="text-black" size={20} />
          </div>
          <div className="flex items-center gap-[8px]">
            <div className="w-[32px] h-[32px] bg-secondary rounded-full flex items-center justify-center">
              <p className="text-[12px] font-regular text-white">{getInitials()}</p>
            </div>
            <div className="max-[425px]:hidden">
              <p className="text-[14px] font-regular text-black">{name}</p>
              <p className="text-[12px]">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
      {isTabletOrMobile && <UserbarMenu value={isOpen} onClick={setIsOpen} />}
    </>
  );
};
