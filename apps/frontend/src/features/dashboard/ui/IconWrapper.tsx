import { getVariantStyles, Variant } from '@/utils/getVariantStyles';
import classNames from 'classnames';
import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
};

export const IconWrapper = ({ children, className, variant = 'default' }: Props) => {
  const { iconBg, color } = getVariantStyles(variant);

  return (
    <div
      className={classNames(
        'shrink-0 flex items-center justify-center w-[40px] h-[40px] rounded-[3px]',
        className,
        iconBg,
        color,
      )}
    >
      {children}
    </div>
  );
};
