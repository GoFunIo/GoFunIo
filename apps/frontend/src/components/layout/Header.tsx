import { Link } from '@tanstack/react-router';
import { useUser } from 'src/hooks/useUser';

export const Header = () => {
  const { data: user, isLoading } = useUser();

  return (
    <header className="p-2 flex gap-6 border-b">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>
      {!user && !isLoading && (
        <Link to="/login" className="[&.active]:font-bold">
          Login
        </Link>
      )}
      {!user && !isLoading && (
        <Link to="/signup" className="[&.active]:font-bold">
          Registration
        </Link>
      )}
      {user && !isLoading && (
        <Link to="/dashboard" className="[&.active]:font-bold">
          Dashboard
        </Link>
      )}
    </header>
  );
};
