import classNames from 'classnames';
import { getPasswordRulesState } from '../lib/passwordRules';

type Props = {
  password: string;
  className?: string;
};

export const PasswordRequirements = ({ password, className }: Props) => {
  const rules = getPasswordRulesState(password);

  return (
    <div
      className={classNames(
        'w-fit grid grid-cols-2 gap-y-[4px] min-[425px]:gap-x-[40px]',
        className,
      )}
    >
      {rules.map((item) => {
        return (
          <div key={item.text} className="flex items-center gap-[4px]">
            <div
              className={classNames(
                'rounded-full h-[10px] w-[10px] shrink-0',
                item.valid ? 'bg-success' : 'bg-icon',
              )}
            ></div>
            <p className="text-[12px] font-medium text-icon">{item.text}</p>
          </div>
        );
      })}
    </div>
  );
};
