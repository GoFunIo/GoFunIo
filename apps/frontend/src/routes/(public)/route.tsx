import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Header } from 'src/components/layout/Header';
import { Footer } from 'src/components/layout/Footer';

export const Route = createFileRoute('/(public)')({
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
