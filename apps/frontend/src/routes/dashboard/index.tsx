import { getUser, signOut } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';
import { queryClient } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: ['me'],
      queryFn: getUser,
    });

    if (!user) {
      throw redirect({
        to: '/login',
      });
    }
  },
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
      <h1 className="text-3xl pb-5">Hello, {user.email}</h1>
      <Button onClick={logout}>Logout</Button>
    </>
  );
}
