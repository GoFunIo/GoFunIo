export type Variant = 'default' | 'info' | 'warning' | 'alert';

const variantStyles: Record<
  Variant,
  { border: string; bg: string; iconBg: string; color: string }
> = {
  default: {
    border: 'border-icon',
    bg: 'bg-bg-page',
    iconBg: 'bg-info-bg-icon',
    color: 'text-info',
  },
  info: {
    border: 'border-info',
    bg: 'bg-info-bg',
    iconBg: 'bg-info-bg-icon',
    color: 'text-info',
  },
  warning: {
    border: 'border-warning',
    bg: 'bg-warning-bg',
    iconBg: 'bg-warning-bg-icon',
    color: 'text-warning',
  },
  alert: {
    border: 'border-alert',
    bg: 'bg-alert-bg',
    iconBg: 'bg-alert-bg-icon',
    color: 'text-alert',
  },
};

export const getVariantStyles = (variant: Variant) => {
  return variantStyles[variant] || variantStyles.default;
};
