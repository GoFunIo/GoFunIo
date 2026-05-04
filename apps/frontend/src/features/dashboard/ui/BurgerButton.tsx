import classNames from 'classnames';
import { Dispatch, SetStateAction } from 'react';

type Props = {
  value: boolean;
  onClick: Dispatch<SetStateAction<boolean>>;
  className?: string;
  hasLabel?: boolean;
};

export const BurgerButton = ({ value, onClick, className, hasLabel = true }: Props) => {
  return (
    <div
      onClick={() => onClick(!value)}
      className={classNames('h-[30px] cursor-pointer', className)}
    >
      <div className="flex items-center h-full">
        <div className="w-[30px] h-full flex items-center justify-center shrink-0">
          <div className="relative w-[15px] h-[10px]">
            <div
              className={classNames(
                '-left-[0px] w-full h-[2px] bg-black rounded-full absolute top-0 custom-transition ',
                {
                  ['-left-[100px]']: value,
                },
              )}
            ></div>
            <div
              className={classNames(
                'w-full h-[2px] bg-black rounded-full absolute top-[4px] custom-transition rotate-0 ',
                {
                  ['rotate-45']: value,
                },
              )}
            ></div>
            <div
              className={classNames(
                'w-full h-[2px] bg-black rounded-full absolute top-[4px] custom-transition -rotate-0 ',
                {
                  ['-rotate-45']: value,
                },
              )}
            ></div>
            <div
              className={classNames(
                'w-full h-[2px] bg-black rounded-full absolute bottom-0 custom-transition -left-[0px] ',
                {
                  ['-left-[100px]']: value,
                },
              )}
            ></div>
          </div>
        </div>
        {hasLabel && (
          <p className="text-[12px] shrink-0 pl-[18px] font-semibold text-black">ZWIŃ MENU</p>
        )}
      </div>
    </div>
  );
};
