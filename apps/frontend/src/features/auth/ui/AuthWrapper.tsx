import React from 'react';
import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { CircleCheckBig, TriangleAlert } from 'lucide-react';
import { getImage } from '@/utils/getImage';

const LogoLight = getImage('logo_autokeep.svg');
const LogoDark = getImage('logo_autokeep_darktheme.svg');

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  type?: 'success' | 'alert';
};

export const AuthWrapper = ({ title, subtitle, children, type }: Props) => {
  return (
    <section className="px-[20px] py-[20px] bg-bg-section flex items-center justify-center h-full">
      <div
        className="
        relative bg-bg-card max-w-[560px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)]
        md:py-[70px] sm:py-[50px] py-[35px]
        md:px-[50px] sm:px-[30px] px-[20px]
      "
      >
        <Link to="/">
          {/* LOGO DLA TRYBU LIGHT */}
          <img
            src={LogoLight}
            alt="Logo company"
            className="m-auto mb-[24px] block dark:hidden w-[150px] h-auto"
          />

          {/* LOGO DLA TRYBU DARK  */}
          <img
            src={LogoDark}
            alt="Logo company"
            className="m-auto mb-[24px] hidden dark:block w-[150px] h-auto"
          />
        </Link>
        {type && (
          <div
            className={classNames(
              'm-auto mb-[24px] rounded-full flex items-center justify-center w-[60px] h-[60px]',
              {
                'bg-success-bg': type === 'success',
                'bg-alert-bg': type === 'alert',
              },
            )}
          >
            {type === 'success' && <CircleCheckBig className="text-success" size={30} />}
            {type === 'alert' && <TriangleAlert className="text-alert" size={30} />}
          </div>
        )}
        <h3 className="text-center pb-[16px]">{title}</h3>
        <p className="text-center">{subtitle}</p>

        {children}
      </div>
    </section>
  );
};
