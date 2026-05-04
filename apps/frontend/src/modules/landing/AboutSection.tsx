import about from '@/assets/img/about.webp';
import aboutMedium from '@/assets/img/aboutMedium.webp';
import aboutSmall from '@/assets/img/aboutSmall.webp';
import { Blob } from './ui/Blob';

const steps = [
  {
    number: 1,
    title: 'Dodaj swoje pojazdy',
    desc: 'Dodawaj dowolną liczbę pojazdów wraz z pełnymi danymi: marka, model, rocznik, VIN, numer rejestracyjny, rodzaj paliwa i przebieg.',
  },
  {
    number: 2,
    title: 'Rejestruj przeglądy i serwisy',
    desc: 'Zapisuj każdą wymianę oleju, przegląd techniczny, odnowienie polisy i naprawę wraz z kosztami oraz notatkami.',
  },
  {
    number: 3,
    title: 'Otrzymuj automatyczne powiadomienia',
    desc: 'Ustaw daty ważności i odbieraj powiadomienia e-mail kilka dni przed terminem — już nigdy niczego nie przegapisz.',
  },
];

export const AboutSection = () => {
  return (
    <section
      id="jak-dziala"
      className="scroll-mt-20 bg-bg-section pt-[70px] pb-[70px] mb-[70px] lg:mb-30 relative overflow-hidden "
    >
      <Blob size="lg" className="-top-[30%] -right-[30%] opacity-80 z-0" />

      <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16 flex flex-col lg:flex-row gap-10 z-10 relative">
        <div className="w-full lg:w-1/2 order-2 lg:order-1">
          <picture>
            <source media="(min-width: 1024px)" srcSet={about} />
            <source media="(min-width: 768px)" srcSet={aboutMedium} />
            <img
              src={aboutSmall}
              alt="Jak działa Autokeep"
              loading="lazy"
              className="w-full h-full rounded-[15px] shadow-lg object-cover aspect-[1/1] sm:aspect-auto xl:aspect-auto lg:object-left"
            />
          </picture>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col gap-8 order-1 lg:order-2">
          <div>
            <h2 className="mb-4">
              Jak działa <span className="text-primary">Autokeep</span>
            </h2>
            <p className="">
              AutoKeep to najprostszy sposób na zarządzanie serwisem pojazdów dla osób prywatnych,
              małych firm czy flot samochodowych. Trzy proste kroki do pełnej kontroli nad Twoją
              flotą.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white font-semibold rounded-[3px] flex items-center justify-center">
                  {step.number}
                </div>

                <div className="flex flex-col gap-1">
                  <h4 className=" font-inter text-[14px] uppercase ">{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
