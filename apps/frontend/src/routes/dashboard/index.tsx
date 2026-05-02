import { useUser } from '@/hooks/useUser';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  return (
    <>
      <h3 className="">Hello, {user.email}</h3>
    </>
  );
}
