import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { signUp } from 'src/api/auth';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';

export const Route = createFileRoute('/signup')({
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
        <Input type="email" value={email} onChange={setEmail} required />
        <Input type="password" value={password} onChange={setPassword} required />
        <Button type="submit">Create account</Button>
      </form>
    </div>
  );
}
