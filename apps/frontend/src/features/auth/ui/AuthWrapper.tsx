import { getImage } from '@/utils/getImage';
import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { CircleCheckBig, TriangleAlert } from 'lucide-react';
import React from 'react';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  type?: 'success' | 'alert';
};

export const AuthWrapper = ({ title, subtitle, children, type }: Props) => {
  return (
    <section className="px-[20px] bg-bg-section flex items-center justify-center h-full">
      <div className="bg-white max-w-[560px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)] md:py-[70px] md:px-[50px] py-[50px] px-[30px]">
        <Link to="/">
          <img src={getImage('logo.svg')} alt="Logo company" className="m-auto mb-[24px]" />
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
