import { getVariantStyles, Variant } from '@/utils/getVariantStyles';
import classNames from 'classnames';
import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
};

export const BlockWrapper = ({ children, className, variant = 'default' }: Props) => {
  const { border, bg } = getVariantStyles(variant);

  return (
    <div className={classNames('p-[25px] rounded-[7px] border bg', className, bg, border)}>
      {children}
    </div>
  );
};
