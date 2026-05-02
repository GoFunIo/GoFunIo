import classNames from 'classnames';
import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const IconWrapper = ({ children, className }: Props) => {
  return (
    <div
      className={classNames(
        'shrink-0 flex items-center justify-center w-[40px] h-[40px] rounded-[3px]',
        className,
      )}
    >
      {children}
    </div>
  );
};
