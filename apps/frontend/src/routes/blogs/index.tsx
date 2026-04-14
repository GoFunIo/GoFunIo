import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { blogs } from './../../api/blogs';

export const Route = createFileRoute('/blogs/')({
  component: Blogs,
});

function Blogs() {
  return (
    <div>
      <h1 className="">Hello "/blogs"!</h1>

      <div className="flex gap-5">
        {blogs.map((item, index) => {
          return (
            <Link
              key={index}
              to="/blogs/$blogId"
              params={{ blogId: item.href }}
              className="border p-5"
            >
              {item.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
