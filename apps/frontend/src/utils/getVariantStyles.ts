export type Variant = 'default' | 'info' | 'warning' | 'alert';

const variantStyles: Record<
  Variant,
  { border: string; bg: string; iconBg: string; color: string; title: string; subtitle: string }
> = {
  default: {
    border: 'border-icon',
    bg: 'bg-bg-page',
    iconBg: 'bg-info-bg-icon',
    color: 'text-info ',
    title: 'text-content-primary ',
    subtitle: 'text-content-secondary',
  },
  info: {
    border: 'border-info',
    bg: 'bg-info-bg dark:bg-bg-card',
    iconBg: 'bg-info-bg-icon',
    color: 'text-info',
    title: 'text-content-primary ',
    subtitle: 'text-content-secondary',
  },
  warning: {
    border: 'border-warning',
    bg: 'bg-warning-bg dark:bg-bg-card',
    iconBg: 'bg-warning-bg-icon',
    color: 'text-warning',
    title: 'text-content-primary ',
    subtitle: 'text-content-secondary',
  },
  alert: {
    border: 'border-alert',
    bg: 'bg-alert-bg dark:bg-bg-card',
    iconBg: 'bg-alert-bg-icon',
    color: 'text-alert',
    title: 'text-content-primary ',
    subtitle: 'text-content-secondary',
  },
};

export const getVariantStyles = (variant: Variant) => {
  return variantStyles[variant] || variantStyles.default;
};
