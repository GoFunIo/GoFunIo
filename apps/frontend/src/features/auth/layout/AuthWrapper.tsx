import { getImage } from '@/utils/getImage';
import { Link } from '@tanstack/react-router';
import React from 'react';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isSuccess?: boolean;
};

export const AuthWrapper = ({ title, subtitle, children, isSuccess = false }: Props) => {
  return (
    <section className="px-[20px] bg-bg-section flex items-center justify-center h-full">
      <div className="bg-white max-w-[560px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)] md:py-[70px] md:px-[50px] py-[50px] px-[30px]">
        <Link to="/">
          <img src={getImage('logo.svg')} alt="Logo company" className="m-auto mb-[24px]" />
        </Link>
        {isSuccess && (
          <div className="w-[61px] h-[61px] rounded-full bg-success/20 relative m-auto mb-[24px]">
            <img
              src={getImage('success-icon.svg')}
              alt="Success verify email"
              className="absolute top-1/2 left-[51%] -translate-x-1/2 -translate-y-1/2"
            />
          </div>
        )}
        <h3 className="text-center pb-[16px]">{title}</h3>
        <p className="text-center">{subtitle}</p>

        {children}
      </div>
    </section>
  );
};
