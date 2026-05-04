import { LucideIcon } from 'lucide-react';

interface FeatureIconProps {
  icon: LucideIcon;
  size?: 'md' | 'lg';
  className?: string;
}

export const FeatureIcon = ({ icon: Icon, size = 'md', className = '' }: FeatureIconProps) => {
  const containerClasses =
    'w-16 h-16 rounded-[7px] flex-shrink-0 flex items-center justify-center bg-primary text-white shadow-md shadow-primary/20';

  const iconSizes = {
    md: 24,
    lg: 32,
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <Icon size={iconSizes[size]} strokeWidth={2} />
    </div>
  );
};
