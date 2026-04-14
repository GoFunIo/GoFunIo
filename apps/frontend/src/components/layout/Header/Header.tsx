import { Link } from '@tanstack/react-router';

export const Header = () => {
  return (
    <header className="p-2 flex gap-6 border-b">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>
      <Link to="/login" className="[&.active]:font-bold">
        Login
      </Link>
      <Link to="/userdashboard" className="[&.active]:font-bold">
        Dashboard
      </Link>
      <Link to="/blogs" className="[&.active]:font-bold">
        Blogs
      </Link>
    </header>
  );
};
