import classNames from 'classnames';
import { Activity, Wrench } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { BoardButton } from '../ui/BoardButton';
import { BlockWrapper } from '../ui/BlockWrapper';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { IconWrapper } from '../ui/IconWrapper';

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
  data?: any[];
  className?: string;
};

export const History = ({ title, button, data = [], className, link }: Props) => {
  const navigate = useNavigate();

  return (
    <BlockWrapper className={classNames('h-fit', className)}>
      <div className="justify-between flex gap-[16px] items-center flex-wrap">
        <div className="flex gap-[10px] items-center">
          <Activity className="text-secondary" size={20} />
          <h4 className="">{title}</h4>
        </div>
        <div className="flex items-center gap-[16px]">
          {link && (
            <BoardButton size="small" variant="outline" onClick={() => navigate({ to: link.href })}>
              {link?.label}
            </BoardButton>
          )}
          {button && (
            <BoardButton size="small" onClick={button.onClick} icon="add">
              {button?.label}
            </BoardButton>
          )}
        </div>
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
