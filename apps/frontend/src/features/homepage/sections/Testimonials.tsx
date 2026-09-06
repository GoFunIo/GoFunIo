import { TestimonialCard } from '@/features/homepage/widgets/TestimonialCard';
import { getImage } from '@/utils/getImage';

const testimonialimage1 = getImage('testimonial-image-1.webp');
const testimonialimage2 = getImage('testimonial-image-2.webp');
const testimonialimage3 = getImage('testimonial-image-3.webp');

const testimonials = [
  {
    id: 1,
    content:
      'Wcześniej zawsze gubiłam kartki od mechanika i zapominałam o terminach OC. Dzięki aplikacji mam wszystko w telefonie i czuję się po prostu bezpieczniej, wiedząc, że auto jest pod kontrolą.',
    author: 'Anna Kowalska',
    role: 'Mama i kierowca na co dzień',
    rating: 4,
    avatar: testimonialimage2,
  },
  {
    id: 2,
    content:
      'Dla mnie liczy się pełna historia serwisowa. Przy sprzedaży auta taki cyfrowy dziennik to potężny atut. Aplikacja jest intuicyjna, szybka i wygląda świetnie na iPhone.',
    author: 'Marek Wiśniewski',
    role: 'Właściciel BMW serii 5',
    rating: 5,
    avatar: testimonialimage1,
  },
  {
    id: 3,
    content:
      'Zarządzanie pięcioma busami w Excelu to był koszmar. Tutaj widzę od razu, który samochód wymaga wymiany olejów czy klocków. Oszczędzam czas i unikam awarii w trasie.',
    author: 'Tomasz Mazur',
    role: 'Właściciel firmy remontowej (5 aut)',
    rating: 4,
    avatar: testimonialimage3,
  },
];

export const Testimonials = () => {
  return (
    <section className="scroll-mt-20 relative mb-[70px] lg:mb-30">
      <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
        <div className="mb-[50px] lg:text-center max-w-[700px] mx-auto">
          <h2 className="mb-4">
            Opinie naszych <span className="text-primary">użytkowników</span>
          </h2>
          <p className="subtitle">
            Od rodzinnych aut po floty biznesowe – pomagamy tysiącom osób dbać o terminowy serwis i
            bezpieczeństwo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
};
