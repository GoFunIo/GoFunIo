import { signOut } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
});

function RouteComponent() {
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
    <>
      <p className="">Hello, {user.email}</p>
      <Button onClick={logout}>Logout</Button>
    </>
  );
}
