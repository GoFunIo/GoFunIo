import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(public)/')({
  component: Index,
});

function Index() {
  return (
    <div className="bg-bg-section p-10">
      <h3 className="pb-8">Hello "/Index"!</h3>
    </div>
  );
}
