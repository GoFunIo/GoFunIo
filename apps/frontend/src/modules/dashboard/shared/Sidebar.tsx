import { Fragment } from 'react';
import { sidebar } from '@/store/sidebarMenu';
import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { useState } from 'react';
import { Logo } from '../ui/Logo';
import { BurgerButton } from '../ui/BurgerButton';

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // outline-none focus:outline-none active:outline-none select-none
  return (
    <div
      className={classNames(
        'overflow-hidden box-sizing custom-transition flex flex-col w-[65px] bg-white border-r border-icon shrink-0',
        {
          ['w-[180px]']: isOpen,
        },
      )}
    >
      <Logo className="pl-[17px] pt-[15px] pb-[12px]" />
      <BurgerButton value={isOpen} onClick={setIsOpen} className="mb-[12px] px-[17px]" />

      {sidebar.map((group, groupIndex) => (
        <Fragment key={groupIndex}>
          <div className="flex flex-col gap-[10px]">
            {group.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  to={item.href}
                  className="cursor-pointer min-h-[30px] px-[17px] group"
                  key={item.id}
                  activeOptions={{
                    exact: true,
                  }}
                >
                  {({ isActive }) => (
                    <div
                      className={classNames(
                        'custom-transition flex items-center group-hover:bg-secondary rounded-[3px] h-full',
                        {
                          'bg-secondary': isActive,
                        },
                      )}
                    >
                      <div className="w-[30px] h-full shrink-0 flex items-center justify-center">
                        <Icon
                          className={classNames(
                            'custom-transition text-black group-hover:text-white',
                            {
                              'text-white': isActive,
                            },
                          )}
                          size={18}
                        />
                      </div>
                      <p
                        className={classNames(
                          'w-[115px] shrink-0 custom-transition text-[12px] group-hover:text-white font-semibold text-black uppercase shrink-0 pl-[18px]',
                          {
                            'text-white': isActive,
                          },
                        )}
                      >
                        {item.title}
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          {groupIndex !== sidebar.length - 1 && (
            <div className="bg-black mx-[17px] h-[2px] my-[10px]" />
          )}
        </Fragment>
      ))}
    </div>
  );
};
