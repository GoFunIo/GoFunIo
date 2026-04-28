import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const [input, setInput] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');
  const [input4, setInput4] = useState('');

  return (
    <div className="bg-bg-section p-10">
      <h3 className="pb-8">Hello "/Index"!</h3>
      <div className="flex flex-col gap-4">
        <Button onClick={() => {}}>Primary</Button>
        <Button disabled onClick={() => {}}>
          Primary
        </Button>
        <Button variant="outline" onClick={() => {}}>
          Primary
        </Button>
        <Button disabled variant="outline" onClick={() => {}}>
          Primary
        </Button>
        <Input
          name="email"
          value={input}
          onChange={setInput}
          placeholder="admin@gmail.com"
          label="Name"
        />
        <Input
          name="password"
          type="password"
          value={input2}
          onChange={setInput2}
          placeholder="admin@gmail.com"
          error="Imię i nazwisko jest wymagane"
        />
        <Input
          name="password"
          label="Qweqwe"
          value={input3}
          onChange={setInput3}
          placeholder="admin@gmail.com"
          error="Imię i nazwisko jest wymagane"
        />
        <Input name="password" value={input4} onChange={setInput4} />
      </div>
    </div>
  );
}
