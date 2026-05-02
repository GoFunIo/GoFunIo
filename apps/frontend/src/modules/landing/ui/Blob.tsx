import classNames from 'classnames';

interface BlobProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

export const Blob = ({ className, size = 'md' }: BlobProps) => {
  const sizeClasses = {
    sm: 'w-[300px] h-[300px]',
    md: 'w-[500px] h-[500px]',
    lg: 'w-[800px] h-[800px]',
    xl: 'w-[1200px] h-[1200px]',
  };

  return (
    <div
      className={classNames(
        'absolute rounded-full pointer-events-none z-0 transition-opacity duration-1000',
        'bg-radial from-primary/50 via-primary/5 to-transparent',
        'blur-[80px] lg:blur-[120px]',
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    />
  );
};
