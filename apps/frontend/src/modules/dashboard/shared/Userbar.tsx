import { useState } from 'react';
import { BurgerButton } from '../ui/BurgerButton';
import { Logo } from '../ui/Logo';
import { useMediaQuery } from 'react-responsive';
import { UserbarMenu } from './UserbarMenu';

export const Userbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 768px)' });

  return (
    <>
      <div className="z-9 h-[64px] pl-[30px] pr-[30px] bg-white border-b border-icon shrink-0">
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
      </div>
      {isTabletOrMobile && <UserbarMenu value={isOpen} onClick={setIsOpen} />}
    </>
  );
};
