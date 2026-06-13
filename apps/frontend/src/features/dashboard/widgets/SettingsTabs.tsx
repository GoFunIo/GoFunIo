import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { Bell, Building2, CreditCard, Users } from 'lucide-react';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';

type SettingsRoutePath =
  | '/dashboard/settings/profile'
  | '/dashboard/settings/users'
  | '/dashboard/settings/notification'
  | '/dashboard/settings/payments';

interface TabItem {
  to: SettingsRoutePath;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const SettingTabs = () => {
  const navigationTabs: TabItem[] = [
    {
      to: '/dashboard/settings/profile',
      title: 'Dane firmy',
      subtitle: 'Profil organizacji',
      icon: <Building2 size={20} />,
    },
    {
      to: '/dashboard/settings/users',
      title: 'Użytkownicy',
      subtitle: 'Zarządzanie zespołem',
      icon: <Users size={20} />,
    },
    {
      to: '/dashboard/settings/notification',
      title: 'Powiadomienia',
      subtitle: 'Ustawienia alertów',
      icon: <Bell size={20} />,
    },
    {
      to: '/dashboard/settings/payments',
      title: 'Subskrypcja',
      subtitle: 'Plan i płatności',
      icon: <CreditCard size={20} />,
    },
  ];

  return (
    <GridWrapper layout={'4-equal'}>
      {navigationTabs.map((tab) => (
        <Link key={tab.to} to={tab.to} className="block text-left no-underline">
          {({ isActive }) => (
            <div
              className={classNames(
                'group flex flex-row items-center justify-start gap-4 p-[16px] rounded-[7px] border h-[72px] w-full custom-transition',
                {
                  'bg-primary border-primary text-white': isActive,
                  'bg-bg-card border-icon text-content-primary hover:border-secondary hover:bg-secondary hover:text-white':
                    !isActive,
                },
              )}
            >
              <IconWrapper
                className={classNames('!rounded-[5px] custom-transition', {
                  '!bg-white/20 !text-white': isActive,
                  'group-hover:!bg-white/20 group-hover:!text-white': !isActive,
                })}
              >
                {tab.icon}
              </IconWrapper>

              <div className="flex flex-col min-w-0 text-left">
                <span
                  className={classNames(
                    'text-[14px] font-bold leading-none mb-1 custom-transition',
                    {
                      'text-white': isActive,
                      'text-content-primary group-hover:text-white': !isActive,
                    },
                  )}
                >
                  {tab.title}
                </span>
                <span
                  className={classNames('text-[12px] font-medium leading-none custom-transition', {
                    'text-white/80': isActive,
                    'text-content-secondary group-hover:text-white/80': !isActive,
                  })}
                >
                  {tab.subtitle}
                </span>
              </div>
            </div>
          )}
        </Link>
      ))}
    </GridWrapper>
  );
};
