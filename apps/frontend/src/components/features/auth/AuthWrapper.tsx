import React from 'react';
import { getImage } from 'src/utils/getImage';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export const AuthWrapper = ({ title, subtitle, children }: Props) => {
  return (
    <section className="px-[20px] bg-bg-section flex items-center justify-center h-full">
      <div className="bg-white max-w-[560px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)] md:py-[70px] md:px-[50px] py-[50px] px-[30px]">
        <img src={getImage('logo.svg')} alt="Logo company" className="m-auto pb-[24px]" />
        <h3 className="text-center pb-[16px]">{title}</h3>
        <p className="text-center">{subtitle}</p>

        {children}
      </div>
    </section>
  );
};
