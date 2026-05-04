import classNames from 'classnames';
import { IconWrapper } from '../ui/IconWrapper';
import { Activity, Wrench } from 'lucide-react';
import { Card } from '../ui/Card';
import { Link } from '@tanstack/react-router';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { BoardButton } from '../ui/BoardButton';

type LinkProps = {
  label: string;
  href: string;
};

type ButtonProps = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  link?: LinkProps;
  button?: ButtonProps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  className?: string;
};

export const History = ({ title, button, data, className, link }: Props) => {
  return (
    <Card className={classNames('h-fit', className)}>
      <div className="flex gap-[10px] items-center">
        <Activity className="text-secondary" size={20} />
        <h4 className="">{title}</h4>
        {link && (
          <Link to={link.href} className="text-secondary text-[12px] ml-[auto]">
            {link?.label}
          </Link>
        )}
        {button && (
          <BoardButton size="small" onClick={button.onClick}>
            {button?.label}
          </BoardButton>
        )}
      </div>
      {!data || data.length === 0 ? (
        <EmptyPlaceholder
          title="Wprowadż pierwszy wpis serwisowy."
          className="min-h-[240px] mt-[16px]"
        />
      ) : (
        <div className="mt-[16px] flex flex-col gap-[16px]">
          {data.map((item) => {
            return (
              <div
                className="not-last:pb-[10px] flex gap-[16px] not-last:border-b not-last:border-icon items-start"
                key={item.id}
              >
                <IconWrapper className="bg-info/25 !h-[30px] !w-[30px] mt-[4px]">
                  <Wrench className="text-info" size={18} />
                </IconWrapper>
                <div className="">
                  <p className="text-dark text-[14px]">{item.title}</p>
                  <p className="text-[12px]">
                    {item.car} - {item.date}
                  </p>
                </div>
                <div className="ml-auto">
                  <p className="text-right text-dark font-bold text-[14px]">{item.price} zł</p>
                  <p className="text-right text-[12px]">{item.place}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
