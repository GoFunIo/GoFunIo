import { getImage } from '@/utils/getImage';
import { Link } from '@tanstack/react-router';

type Props = {
  className?: string;
};

export const Logo = ({ className }: Props) => {
  return (
    <Link to="/" className={className}>
      <img
        src={getImage('logo_autokeep_light.svg')}
        alt="Logo"
        className="block dark:hidden w-[30px] h-[37px]"
      />
      <img
        src={getImage('logo_autokeep_dark.svg')}
        alt="Logo"
        className="hidden dark:block w-[30px] h-[37px]"
      />
    </Link>
  );
};
