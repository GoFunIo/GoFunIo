import { Blob } from './../ui/Blob';
import { InstagramIcon, XIcon, FacebookIcon } from '../ui/Icons';
import LogoLight from '@/assets/logo/logo_autokeep.svg';
import LogoDark from '@/assets/logo/logo_autokeep_darktheme.svg';

export const Footer = () => {
  return (
    <footer id="kontakt" className="relative bg-bg-section pt-[70px]  overflow-hidden">
      <Blob size="md" className="-top-[20%] -left-[10%] opacity-60 z-0" />

      <div className="container relative z-10 mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[50px] lg;gap-8 items-start mb-[70px]">
          <div className="lg:col-start-7 lg:col-span-6 flex flex-col gap-4 max-w-[550px] lg:order-2">
            <div>
              <h3 className="mb-3">
                <span className="text-primary">Masz pytania?</span> Chętnie pomożemy.
              </h3>
              <p className="subtitle text-content-primary">
                Nasz zespół jest dostępny od poniedziałku do piątku w godzinach 8:00 – 16:00.
              </p>
            </div>
            <a
              href="mailto:kontakt@autokeep.pl"
              className=" text-[24px] font-inter font-semibold text-content-primary hover:text-secondary transition-colors tracking-tight"
            >
              kontakt@autokeep.pl
            </a>
          </div>

          <div className="lg:col-start-1 lg:col-span-6 flex flex-col gap-4 max-w-[550px] lg:order-1">
            <div>
              <img
                src={LogoLight}
                alt="AutoKeep Logo"
                className="h-13 w-auto block dark:hidden transition-all duration-500"
              />

              <img
                src={LogoDark}
                alt="AutoKeep Logo"
                className="h-13 w-auto hidden dark:block transition-all duration-500"
              />
            </div>
            <p className="text-content-secondary mb-4">
              Najprostszy sposób na zarządzanie serwisem, przeglądami i kosztami pojazdów. Nigdy
              więcej nie przegapisz terminu.
            </p>

            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/"
                target="blank"
                className="text-primary hover:text-secondary"
              >
                <InstagramIcon className="w-8 h-8" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="blank"
                className="rounded-[7px] text-primary hover:text-secondary"
              >
                <FacebookIcon className="w-8 h-8" />
              </a>
              <a
                href="https://x.com/?lang=pl"
                target="blank"
                className="text-primary hover:text-secondary"
              >
                <XIcon className="w-8 h-8" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 pb-6 border-t border-content-secondary flex flex-col md:row items-start  ">
          <p className="">
            Copyright ©2026 AutoKeep |
            <a href="#" className="hover:text-primary transition-colors ml-2">
              Regulamin
            </a>{' '}
            |
            <a href="#" className="hover:text-primary transition-colors ml-2">
              Polityka Prywatności
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
