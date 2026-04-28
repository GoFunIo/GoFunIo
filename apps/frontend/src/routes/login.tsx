import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getUser, signIn } from 'src/api/auth';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';
import { queryClient } from 'src/lib/queryClient';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: ['me'],
      queryFn: getUser,
    });

    if (user) {
      throw redirect({
        to: '/userdashboard',
      });
    }
  },
  component: Login,
});

function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const logIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const user = await signIn(email, password);
      queryClient.setQueryData(['me'], user);
      navigate({ to: '/userdashboard' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col max-w-[240px] gap-5">
      <h1 className="text-3xl">Login</h1>
      <form action="" onSubmit={logIn} className="flex flex-col gap-5">
        <Input name="email" type="email" value={email} onChange={setEmail} />
        <Input name="password" type="password" value={password} onChange={setPassword} />
        <Button type="submit">Login</Button>
      </form>
      <Link to="/signup" className="p-2 bg-gray-100 text-center border">
        Create account
      </Link>
    </div>
  );
}
