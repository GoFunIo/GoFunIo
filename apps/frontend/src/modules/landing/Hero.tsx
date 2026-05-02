import { Button } from '@/components/ui/Button';
import heroApp from '@/assets/img/heroApp.webp';
import heroAppSmall from '@/assets/img/heroAppSmall.webp';
import heroFleet from '@/assets/img/heroFleet.webp';
import heroFleetSmall from '@/assets/img/heroFleetSmall.webp';
import heroService from '@/assets/img/heroService.webp';
import heroServiceSmall from '@/assets/img/heroServiceSmall.webp';
import { Blob } from './ui/Blob';

export const Hero = () => {
  return (
    <section
      id="home"
      className="relative pt-[124px] lg:pt-40 pb-20 mb-[70px] lg:mb-30 overflow-hidden bg-bg-section"
    >
      <Blob size="xl" className="-top-[60%] -left-[40%] opacity-80 z-0" />

      <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16 grid grid-cols-4 md:grid-cols-12 gap-4 md:gap-5 lg:gap-8 items-center z-10 relative">
        <div className=" col-span-4 md:col-span-12 lg:col-span-6 flex flex-col gap-10 items-center text-center md:items-start md:text-left pt-6 pb-6">
          <h1 className="">
            Twój samochód <span className="text-primary">zawsze gotowy</span> do drogi
          </h1>
          <p className="subtitle">
            Wszystkie przeglądy i koszty pojazdów w jednym miejscu. Automatyczne przypomnienia,
            zanim będzie za późno.
          </p>
          <div
            className="
              flex flex-col sm:flex-row gap-4 w-full
              sm:w-auto items-center"
          >
            <Button variant="default">Zacznij za darmo</Button>
            <Button variant="outline">Dowiedz się więcej</Button>
          </div>
          <p>Bezpłatny okres próbny — bez karty kredytowej</p>
        </div>

        <div className="col-span-4 md:col-span-12 lg:col-span-6 h-full">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 lg:gap-6 h-full max-h-[350px] md:max-h-[600px]">
            <div className="row-span-2">
              <picture className="h-full w-full">
                <source media="(min-width: 768px)" srcSet={heroApp} />
                <img
                  src={heroAppSmall}
                  alt="Autokeep App"
                  className="w-full h-full object-cover rounded-[15px] shadow-lg"
                />
              </picture>
            </div>

            <div className="col-start-2">
              <picture className="h-full w-full">
                <source media="(min-width: 768px)" srcSet={heroService} />
                <img
                  src={heroServiceSmall}
                  alt="Serwis"
                  className="w-full h-full object-cover rounded-[15px] shadow-lg"
                />
              </picture>
            </div>

            <div className="col-start-2 row-start-2">
              <picture className="h-full w-full">
                <source media="(min-width: 768px)" srcSet={heroFleet} />
                <img
                  src={heroFleetSmall}
                  alt="Flota"
                  className="w-full h-full object-cover rounded-[15px] shadow-lg"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
