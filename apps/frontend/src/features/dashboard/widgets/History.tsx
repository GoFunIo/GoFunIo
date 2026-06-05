import classNames from 'classnames';
import {
  Activity,
  SquareCheckBig,
  Droplet,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CalendarCog,
} from 'lucide-react';
import { BoardButton } from '../ui/BoardButton';
import { BlockWrapper } from '../ui/BlockWrapper';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { IconWrapper } from '../ui/IconWrapper';
import { ToOptions, useNavigate } from '@tanstack/react-router';

type LinkProps = {
  label: string;
  href: ToOptions['to'];
};

type ButtonProps = {
  label: string;
  onClick: () => void;
};

export type HistoryDataItem = {
  id: number;
  title: string;
  car: string;
  date: string;
  price: string;
  place: string;
  type: 'service' | 'oil' | 'inspection' | 'insurance_ac' | 'insurance_oc' | 'other';
};

type Props = {
  title: string;
  link?: LinkProps;
  button?: ButtonProps;
  data?: HistoryDataItem[];
  className?: string;
};

const activityIcons = {
  service: SquareCheckBig,
  oil: Droplet,
  inspection: CalendarCog,
  insurance_ac: ShieldCheck,
  insurance_oc: ShieldAlert,
  other: HelpCircle,
};

export const History = ({ title, button, data = [], className, link }: Props) => {
  const navigate = useNavigate();

  return (
    <BlockWrapper className={classNames('h-fit', className)}>
      <div className="flex gap-[10px] items-center mb-6">
        <Activity className="text-secondary" size={20} />
        <h4 className="">{title}</h4>
        {link && (
          <BoardButton
            size="small"
            variant="outline"
            className="ml-[auto]"
            onClick={() => navigate({ to: link.href })}
          >
            {link.label}
          </BoardButton>
        )}

        {button && (
          <BoardButton size="small" onClick={button.onClick} className="ml-[auto]">
            {button.label}
          </BoardButton>
        )}
      </div>

      {!data || data.length === 0 ? (
        <EmptyPlaceholder
          title="Wprowadż pierwszy wpis serwisowy."
          className="min-h-[240px] mt-[16px]"
        />
      ) : (
        <div className=" flex flex-col gap-[16px]">
          {data.map((item) => {
            const IconComponent = activityIcons[item.type] || HelpCircle;

            return (
              <div
                className="not-last:pb-[10px] flex gap-[16px] not-last:border-b not-last:border-icon items-start"
                key={item.id}
              >
                <IconWrapper className="bg-info-bg text-info shrink-0 rounded-[6px]">
                  <IconComponent size={20} strokeWidth={2} />
                </IconWrapper>

                <div className="">
                  <p className="text-content-primary text-[14px]">{item.title}</p>
                  <p className="text-[12px]">
                    {item.car} - {item.date}
                  </p>
                </div>
                <div className="ml-auto">
                  <p className="text-right text-content-primary font-bold text-[14px]">
                    {item.price} zł
                  </p>
                  <p className="text-right text-[12px]">{item.place}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BlockWrapper>
  );
};
