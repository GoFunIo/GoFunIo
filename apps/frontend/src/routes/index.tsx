import { createFileRoute } from '@tanstack/react-router';
import { Button } from 'src/components/ui/Button';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div>
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
      </div>
    </div>
  );
}
