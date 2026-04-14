import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/blogs')({
  component: BlogsLayout,
});

function BlogsLayout() {
  return <Outlet />;
}
