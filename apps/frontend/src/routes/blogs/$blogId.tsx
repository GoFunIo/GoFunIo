import { createFileRoute } from '@tanstack/react-router';
import { blogs } from './../../api/blogs';

export const Route = createFileRoute('/blogs/$blogId')({
  loader: ({ params }) => {
    return blogs.find((b) => b.href === params.blogId);
  },
  component: Blog,
});

function Blog() {
  const blog = Route.useLoaderData();

  if (!blog) return <div>Not found</div>;

  return (
    <div>
      Post ID: {blog.href}
      <h2>{blog.title}</h2>
    </div>
  );
}
