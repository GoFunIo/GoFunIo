import { AvatarStack } from './ui/AvatarStack';
import { CTARegistrationForm } from './components/CTARegistrationForm';
import avatar1 from '@/assets/img/testimonial-image-1.webp';
import avatar2 from '@/assets/img/testimonial-image-2.webp';
import avatar3 from '@/assets/img/testimonial-image-3.webp';
import ctaLarge from '@/assets/img/ctaLarge.webp';
import { SocialProofBadge } from './ui/SocialProofBadge';

const AVATAR_URLS = [avatar1, avatar2, avatar3];

export const CTASection = () => {
  return (
    <section className="scroll-mt-20 relative min-h-[500px] flex items-center overflow-hidden py-[70px] mb-[70px] lg:mb-30">
      <div className="absolute inset-0 z-0">
        <img
          src={ctaLarge}
          alt="Dashboard"
          className="w-full h-full object-cover lg:object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/30" />
      </div>

      <div className="container mx-auto px-4 sm:px-8 lg:px-16 relative z-10 max-w-[1440px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 md:grid-row items-center gap-10 xl:gap-20">
          <div className="lg:col-span-6  md:pb-0 flex flex-col pb-8 md:pb-0 gap-8">
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

          <div className=" col-span-1 lg:col-start-8 lg:col-end-13 w-full">
            <div className="w-full max-w-[450px] ml-auto">
              <CTARegistrationForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
