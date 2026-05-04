import { getImage } from '@/utils/getImage';
import { Link } from '@tanstack/react-router';

type Props = {
  className?: string;
};

export const Logo = ({ className }: Props) => {
  return (
    <Link to="/" className={className}>
      <img src={getImage('logo-min.svg')} alt="Logo" />
    </Link>
  );
};
