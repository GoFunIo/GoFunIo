import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getUser, signUp } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { queryClient } from '@/lib/queryClient';

export const Route = createFileRoute('/signup')({
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

  component: Signup,
});

function Signup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const createAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const user = await signUp(email, password);
      queryClient.setQueryData(['me'], user);
      navigate({ to: '/userdashboard' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-3xl pb-5">Signup</h1>
      <form action="" onSubmit={createAccount} className="flex flex-col max-w-[240px] gap-5">
        <Input name="email" type="email" value={email} onChange={setEmail} />
        <Input name="password" type="password" value={password} onChange={setPassword} />
        <Button type="submit">Create account</Button>
      </form>
    </div>
  );
}
