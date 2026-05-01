import { sidebar } from '@/store/sidebarMenu';
import { getImage } from '@/utils/getImage';
import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { useState } from 'react';

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
      <Link to="/" className="pl-[17px] pt-[15px] pb-[12px]">
        <img src={getImage('logo-min.svg')} alt="Logo" />
      </Link>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-[30px] mb-[12px] px-[17px] cursor-pointer"
      >
        <div className="flex items-center h-full">
          <div className="w-[30px] h-full flex items-center justify-center shrink-0">
            <div className="relative w-[15px] h-[10px]">
              <div
                className={classNames(
                  '-left-[0px] w-full h-[2px] bg-black rounded-full absolute top-0 custom-transition ',
                  {
                    ['-left-[100px]']: isOpen,
                  },
                )}
              ></div>
              <div
                className={classNames(
                  'w-full h-[2px] bg-black rounded-full absolute top-[4px] custom-transition rotate-0 ',
                  {
                    ['rotate-45']: isOpen,
                  },
                )}
              ></div>
              <div
                className={classNames(
                  'w-full h-[2px] bg-black rounded-full absolute top-[4px] custom-transition -rotate-0 ',
                  {
                    ['-rotate-45']: isOpen,
                  },
                )}
              ></div>
              <div
                className={classNames(
                  'w-full h-[2px] bg-black rounded-full absolute bottom-0 custom-transition -left-[0px] ',
                  {
                    ['-left-[100px]']: isOpen,
                  },
                )}
              ></div>
            </div>
          </div>
          <p className="text-[12px] shrink-0 pl-[18px] font-semibold text-black">ZWIŃ MENU</p>
        </div>
      </div>

      {sidebar.map((group, groupIndex) => (
        <>
          <div className="flex flex-col gap-[10px]" key={groupIndex}>
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
        </>
      ))}
    </div>
  );
};
