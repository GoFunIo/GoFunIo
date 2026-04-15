import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { signOut } from 'src/api/auth';
import { Button } from 'src/components/ui/Button';
import { useUser } from 'src/hooks/useUser';

export const Route = createFileRoute('/userdashboard')({
  component: UserDashboard,
});

function UserDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser();

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  const logout = async () => {
    try {
      await signOut();
      queryClient.setQueryData(['me'], null);
      navigate({ to: '/login' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-3xl pb-5">Hello, {user.email}</h1>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
}
