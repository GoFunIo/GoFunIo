import classNames from 'classnames';
import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const Card = ({ children, className }: Props) => {
  return (
    <div className={classNames('bg-bg-page p-[25px] rounded-[7px] border border-icon', className)}>
      {children}
    </div>
  );
};
