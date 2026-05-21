import { Star } from 'lucide-react';
import { QuoteIcon } from '../ui/Icons';

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
    <div className="group relative p-8 rounded-[15px] flex flex-col bg-bg-card border border-transparent transition-all duration-300 shadow-card gap-5 hover:bg-bg-section hover:border-primary hover:shadow-hover hover:-translate-y-1">
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-primary transition-colors  duration-300 pointer-events-none">
        <QuoteIcon className="w-35 h-35 opacity-10 group-hover:opacity-20 transition-opacity duration-300 z-0" />
      </div>

      <div className="flex-grow relative z-10">
        <p className="text-content-secondary italic leading-relaxed">"{content}"</p>
      </div>

      <div className="flex gap-0.5 ">
        {Array.from({ length: 5 }, (_, i) => (
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
          <p className="font-inter font-semibold text-content-secondary leading-tight mb-0.5">
            {author}
          </p>
          <p className="text-[12px] text-icon">{role}</p>
        </div>
      </div>
    </div>
  );
};
