import { BenefitCard } from '@/features/homepage/widgets/BenefitCard';
import {
  FileChartColumn,
  BellRing,
  Wrench,
  BadgeDollarSign,
  FolderCheck,
  CarFront,
} from 'lucide-react';

const benefits = [
  {
    id: 1,
    icon: FileChartColumn,
    title: 'Pełna historia pojazdu',
    desc: 'Przechowuj kompletną cyfrową dokumentację każdego auta w bezpiecznej chmurze, dostępną z dowolnego urządzenia 24/7.',
  },
  {
    id: 2,
    icon: BellRing,
    title: 'Automatyczne powiadomienia',
    desc: 'Otrzymuj automatyczne powiadomienia o nadchodzących przeglądach i badaniach, zanim termin ich ważności dobiegnie końca.',
    highlight: false,
  },
  {
    id: 3,
    icon: Wrench,
    title: 'Diagnostyka pojazdu',
    desc: 'Uzyskaj błyskawiczny wgląd w kondycję swoich samochodów oraz historię napraw, co pozwoli Ci uniknąć kosztownych niespodzianek.',
  },
  {
    id: 4,
    icon: BadgeDollarSign,
    title: 'Optymalizacja kosztów',
    desc: 'Skutecznie planuj wydatki i unikaj nieplanowanych awarii dzięki monitorowaniu terminów wymiany części i płynów.',
  },
  {
    id: 5,
    icon: FolderCheck,
    title: 'Kontrola dokumentacji',
    desc: 'Zarządzaj dokumentami, polisami i historią serwisową wszystkich pojazdów w jednym, intuicyjnym centrum dowodzenia online.',
  },
  {
    id: 6,
    icon: CarFront,
    title: 'Zarządzanie flotą',
    desc: 'Niezależnie od liczby posiadanych aut, nasza platforma dostosuje się do Twoich potrzeb, oferując narzędzia klasy profesjonalnej.',
    highlight: true,
  },
];

export const BenefitsSection = () => {
  return (
    <section id="funkcje" className="scroll-mt-20 mb-[70px] lg:mb-30">
      <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
        <div className="mb-12.5 lg:text-center max-w-[760px] mx-auto">
          <h2 className="mb-4">
            Dlaczego <span className="text-primary">AutoKeep?</span>
          </h2>
          <p className="subtitle ">
            Dołącz do tysięcy właścicieli pojazdów i menedżerów flot, którzy ufają AutoKeep w
            kwestii terminowości przeglądów i serwisu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit) => (
            <BenefitCard
              key={benefit.id}
              title={benefit.title}
              desc={benefit.desc}
              icon={benefit.icon}
              className="w-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
};
