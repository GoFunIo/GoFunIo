import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Footer } from 'react-day-picker';
import { Header } from 'src/components/layout';

export const Route = createFileRoute('/(auth)')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col h-full">
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
