import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { signIn } from 'src/api/auth';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';

export const Route = createFileRoute('/login')({
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
        <Input type="email" value={email} onChange={setEmail} required />
        <Input type="password" value={password} onChange={setPassword} required />
        <Button type="submit">Login</Button>
      </form>
      <Link to="/signup" className="p-2 bg-gray-100 text-center border">
        Create account
      </Link>
    </div>
  );
}
