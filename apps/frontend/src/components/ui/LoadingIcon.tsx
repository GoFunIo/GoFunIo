import { LoaderCircle } from 'lucide-react';

type Props = {
  size?: number;
  className?: string;
};

export const LoadingIcon = ({ size = 24, className }: Props) => {
  return <LoaderCircle size={size} className={`animate-spin ${className}`} />;
};
