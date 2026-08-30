import classNames from 'classnames';
import { LucideIcon } from 'lucide-react';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';

type BucketProps = {
  title: string;
  icon: LucideIcon;
  stats: {
    days7: number;
    days30: number;
    days60?: number;
  };
};

export const AdminAlertBucket = ({ title, icon: Icon, stats }: BucketProps) => {
  const baseItemStyle = 'px-4 py-4 border rounded-[7px] bg-bg-card text-center transition-colors';
  const labelStyle = 'text-[12px] text-content-secondary font-medium';
  const baseNumberStyle = 'text-[24px] font-bold leading-none mb-1';
  const hasExtendedBucket = stats.days60 !== undefined;

  return (
    <div className="p-[20px] rounded-[7px] border border-icon bg-bg-page">
      <div className="flex gap-4 items-center mb-6">
        <IconWrapper>
          <Icon className="text-info" size={20} />
        </IconWrapper>
        <p className="text-[16px] font-bold text-content-primary">{title}</p>
      </div>

      <div
        className={classNames('gap-[16px] grid sm:grid-cols-1', {
          'md:grid-cols-3': hasExtendedBucket,
          'md:grid-cols-2': !hasExtendedBucket,
        })}
      >
        <div
          className={classNames(baseItemStyle, stats.days7 > 0 ? 'border-alert' : 'border-icon')}
        >
          <p
            className={classNames(
              baseNumberStyle,
              stats.days7 > 0 ? 'text-alert' : 'text-content-primary',
            )}
          >
            {stats.days7}
          </p>
          <p className={labelStyle}>≤ 7 dni</p>
        </div>

        <div
          className={classNames(baseItemStyle, stats.days30 > 0 ? 'border-warning' : 'border-icon')}
        >
          <p
            className={classNames(
              baseNumberStyle,
              stats.days30 > 0 ? 'text-warning' : 'text-content-primary',
            )}
          >
            {stats.days30}
          </p>
          <p className={labelStyle}>≤ 30 dni</p>
        </div>

        {hasExtendedBucket && (
          <div
            className={classNames(
              baseItemStyle,
              (stats.days60 ?? 0) > 0 ? 'border-info' : 'border-icon',
            )}
          >
            <p
              className={classNames(
                baseNumberStyle,
                (stats.days60 ?? 0) > 0 ? 'text-info' : 'text-content-primary',
              )}
            >
              {stats.days60}
            </p>
            <p className={labelStyle}>≤ 60 dni</p>
          </div>
        )}
      </div>
    </div>
  );
};
