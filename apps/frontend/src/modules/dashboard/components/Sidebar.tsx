import { getImage } from '@/utils/getImage';
import { Link } from '@tanstack/react-router';

export const Sidebar = () => {
  return (
    <div className="flex flex-col items-center pt-[15px] w-[64px] bg-white border-r border-icon shrink-0">
      <Link to="/">
        <img src={getImage('logo-min.svg')} alt="Logo" />
      </Link>
    </div>
  );
};
