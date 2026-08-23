import classNames from 'classnames';
import React from 'react';

type Props = {
  children: React.ReactNode;
  layout?: '5-equal' | '4-equal' | '3-equal' | '3-unequal' | '2-equal' | '2-unequal';
  className?: string;
};

export const GridWrapper = ({ layout, children, className }: Props) => {
  return (
    <div
      className={classNames('grid md:gap-[24px] gap-[15px]', {
        'xl:grid-cols-5 sm:grid-cols-2 grid-cols-1': layout === '5-equal',
        'lg:grid-cols-4 sm:grid-cols-2 grid-cols-1': layout === '4-equal',
        'lg:grid-cols-3 sm:grid-cols-2 grid-cols-1': layout === '3-equal',
        'lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 lg:[&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2':
          layout === '3-unequal',
        'lg:grid-cols-3 grid-cols-1 lg:[&>*:nth-child(1)]:col-span-2 lg:[&>*:nth-child(2)]:col-span-1':
          layout === '2-unequal',
        'lg:grid-cols-2 grid-cols-1': layout === '2-equal',
        className,
      })}
    >
      {children}
    </div>
  );
};
