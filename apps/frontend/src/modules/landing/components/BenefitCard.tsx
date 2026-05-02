import React from 'react';
import classNames from 'classnames';
import { FeatureIcon } from './../ui/FeatureIcon';
import { LucideIcon } from 'lucide-react';

interface BenefitCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  className?: string;
}

export const BenefitCard = ({ title, desc, icon, className }: BenefitCardProps) => {
  return (
    <div
      className={classNames(
        'group p-10 rounded-[15px] bg-bg-card shadow-card flex flex-col items-center text-center gap-6',
        'border border-transparent transition-all duration-300',

        // HOVER GRUPOWY:
        'hover:bg-bg-section hover:border-secondary hover:shadow-hover hover:-translate-y-1',
        className,
      )}
    >
      <FeatureIcon
        icon={icon}
        size="md"
        className="transition-transform duration-300 group-hover:scale-110"
      />

      <div className="flex flex-col gap-4">
        <h4 className="text-xl font-bold ">{title}</h4>
        <p className="text-content-secondary leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};
