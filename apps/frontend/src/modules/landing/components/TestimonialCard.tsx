import { Star } from 'lucide-react';

interface TestimonialCardProps {
  content: string;
  author: string;
  role: string;
  rating: number;
  avatar: string;
}

export const TestimonialCard = ({
  content,
  author,
  role,
  rating,
  avatar,
}: TestimonialCardProps) => {
  return (
    <div
      className="group relative p-8 rounded-[15px] flex flex-col bg-bg-card border border-transparent transition-all duration-300 shadow-card  gap-5

    hover:bg-bg-section hover:border-primary hover:shadow-hover hover:-translate-y-1
    "
    >
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-primary transition-colors duration-300 pointer-events-none">
        <svg
          width="140"
          height="140"
          viewBox="0 0 130 131"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-10 group-hover:opacity-20 transition-opacity duration-300"
        >
          <path
            d="M38.8497 34.6699L35.5469 29.5527C12.6953 45.0312 0 63.8379 0 79.3164C0 94.2831 10.92 101.32 20.1866 101.32C31.8662 101.32 40.1172 91.3397 40.1172 80.8515C40.1172 72.0254 34.5312 64.4765 27.04 61.66C24.8828 60.8904 22.8516 60.2518 22.8516 56.5428C22.8516 51.8105 26.2803 44.7774 38.8497 34.6699ZM89.2491 34.6699L85.9463 29.5527C63.3466 45.0312 50.3994 63.8379 50.3994 79.3164C50.3994 94.2831 61.5713 101.32 70.8378 101.32C82.6434 101.32 91.0244 91.3397 91.0244 80.8515C91.0244 72.0254 85.3125 64.4765 77.5653 61.66C75.4081 60.8904 73.5028 60.2518 73.5028 56.5428C73.5028 51.8105 77.0575 44.7733 89.245 34.6658L89.2491 34.6699Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="flex-grow relative z-10">
        <p className="text-content-secondary italic leading-relaxed">"{content}"</p>
      </div>

      <div className="flex gap-0.5 ">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`${i < rating ? 'fill-primary text-primary' : 'text-primary'}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white transition-transform duration-300 ">
          <img src={avatar} alt={author} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-inter font-semibold text-content-secondary leading-tight">{author}</p>
          <p className="text-[12px] text-icon mt-0.5">{role}</p>
        </div>
      </div>
    </div>
  );
};
