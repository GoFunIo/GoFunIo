import avatar1 from '@/assets/img/testimonial-image-1.webp';
import avatar2 from '@/assets/img/testimonial-image-2.webp';
import avatar3 from '@/assets/img/testimonial-image-3.webp';
import ctaLarge from '@/assets/img/ctaLarge.webp';
import { SocialProofBadge } from '@/features/homepage/ui/SocialProofBadge';
import { AvatarStack } from '@/features/homepage/ui/AvatarStack';
import { Button } from '@/components/ui/Button';

const AVATAR_URLS = [avatar1, avatar2, avatar3];

export const CTASection = () => {
  return (
    <section className="scroll-mt-20 relative lg:min-h-[700px] flex items-center overflow-hidden  mb-[70px] lg:mb-30  py-[50px] lg:py-0">
      <div className="absolute inset-0 z-0">
        <img
          src={ctaLarge}
          alt="Dashboard"
          className="w-full h-full object-cover lg:object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/30" />
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[50%] block bg-primary/70 z-10 md:top-0 md:left-auto md:right-0  md:h-full md:w-[50%] lg:w-[45%] " />

      <div className="container mx-auto px-4 sm:px-8 lg:px-16 relative z-10 max-w-[1440px] ">
        <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 md:grid-row items-center gap-10 xl:gap-20">
          <div className="md:col-span-6  pb-20 md:pb-0 flex flex-col pb-8 gap-8">
            <SocialProofBadge text="Twoje centrum dowodzenia" />

            <h2 className="text-white ">
              Przejmij <span className="text-primary">pełną kontrolę</span> nad swoim autem.
              Dzisiaj.
            </h2>

            <div className="flex flex-row items-center lg:items-start gap-6">
              <AvatarStack avatars={AVATAR_URLS} />
              <div className="space-y-1">
                <p className="text-[14px] text-white font-bold">Średnia ocena 4.9/5</p>
                <p className="text-white/90 text-[14px]">
                  Dołącz do 50 000+ zadowolonych kierowców
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 lg:col-start-8 lg:col-end-13 w-full md:px-4 lg:p-0 ">
            <div className="max-w-[450px] mx-auto lg:ml-auto text-center">
              <p className="mb-4 text-white font-bold uppercase text-[14px]">Bądźmy w kontakcie</p>
              <h3 className="text-white text-[24px] font-bold mb-4">Chcesz spróbować już dziś?</h3>
              <p className="text-white/90 mb-6 ">
                Masz pytania dotyczące AutoKeep lub chcesz zobaczyć, jak system sprawdzi się w
                Twojej flocie? Napisz do nas.
              </p>
              <a
                href="mailto:kontakt@autokeep.pl"
                className="block text-[24px] font-bold text-white mb-10 hover:text-blue-200 transition"
              >
                kontakt@autokeep.pl
              </a>
              <p className="mb-[10px] text-white text-[12px]">7-dniowy okres próbny</p>
              <Button variant="outline" type="button" className="uppercase w-full mb-[10px]">
                Wypróbuj za darmo
              </Button>
              <p className="text-white/90 text-[14px] ">
                Karta płatnicza nie jest wymagana. Rejestracja bez ryzyka.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
