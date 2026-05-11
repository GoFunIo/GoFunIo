import { sidebar } from '@/store/sidebarMenu';
import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { Dispatch, SetStateAction } from 'react';

type Props = {
  value: boolean;
  onClick: Dispatch<SetStateAction<boolean>>;
};

export const UserbarMenu = ({ value, onClick }: Props) => {
  return (
    <div
      className={classNames(
        'z-9 fixed h-0 custom-transition overflow-hidden w-screen bg-white min-[426px]:top-[64px] top-[50px] px-[15px]',
        {
          'h-screen': value,
        },
      )}
    >
      <div className="pt-[20px]">
        {sidebar.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className="flex flex-col gap-[4px]">
              {group.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    to={item.href}
                    className="cursor-pointer group"
                    key={item.id}
                    onClick={() => onClick(false)}
                    activeOptions={{
                      exact: true,
                    }}
                  >
                    {({ isActive }) => (
                      <div
                        className={classNames(
                          'min-h-[40px] custom-transition flex items-center group-hover:bg-secondary rounded-[3px] h-full',
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
                            'custom-transition text-[12px] group-hover:text-white font-semibold text-black uppercase shrink-0 pl-[18px]',
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
              <div className="bg-black w-full h-[2px] my-[10px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
