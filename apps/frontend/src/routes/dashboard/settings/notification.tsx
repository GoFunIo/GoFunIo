import { Input } from '@/components/ui/Input';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { formatDays } from '@/utils/formatDays';
import { createFileRoute } from '@tanstack/react-router';
import classNames from 'classnames';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/settings/notification')({
  component: RouteComponent,
});

type Settings = {
  id: number;
  value: number;
};

function RouteComponent() {
  const [newSetting, setNewSetting] = useState<string>('');
  const [currentSettings, setCurrentSettings] = useState<Settings[]>([]);
  const [settings, setSettings] = useState<Settings[]>([
    {
      id: 1,
      value: 30,
    },
    {
      id: 2,
      value: 15,
    },
    {
      id: 3,
      value: 7,
    },
    {
      id: 4,
      value: 1,
    },
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (/^\d*$/.test(newValue)) {
      setNewSetting(newValue);
    }
  };

  const addSettings = () => {
    setSettings([
      ...settings,
      {
        id: Math.floor(Math.random() * 999999) + 1,
        value: Number(newSetting),
      },
    ]);
  };

  const toggleCurrentSettings = (item: Settings) => {
    if (!currentSettings.includes(item)) {
      setCurrentSettings([...currentSettings, item]);
    } else {
      setCurrentSettings(currentSettings.filter((setting) => setting.id !== item.id));
    }
  };

  const removeSetting = (item: Settings) => {
    setCurrentSettings(currentSettings.filter((setting) => setting.id !== item.id));
  };

  const validateButton = () => {
    if (newSetting.length === 0 || settings.some((item) => item.value === +newSetting)) {
      return true;
    }

    return false;
  };

  return (
    <>
      <GridWrapper layout="2-equal">
        <BlockWrapper>
          <div className="border-b border-icon pb-[24px] mb-[24px]">
            <div className="flex items-center gap-[8px] mb-[16px]">
              <Bell className="text-primary" size={18} />
              <p className="text-[16px] text-content-primary font-bold">
                Przypomnienia o terminach
              </p>
            </div>
            <p className="text-[16px] text-content-secondary mb-[16px]">
              Możesz ustawić dowolnie wiele przypomnień
            </p>
            <div className="mb-[24px]">
              <p className="text-[14px] text-content-secondary mb-[10px]">Aktywne ustawienia</p>
              {currentSettings.length > 0 ? (
                <div className="flex items-center gap-[16px] flex-wrap">
                  {currentSettings.map((item) => {
                    return (
                      <div
                        key={item.id}
                        className="shrink-0 bg-info-bg  flex gap-[8px] items-center h-[30px] w-fit rounded-[3px] px-[8px]"
                      >
                        <p className="text-[12px] text-dark">
                          {item.value} {formatDays(item.value)}
                        </p>
                        <button
                          onClick={() => removeSetting(item)}
                          className="cursor-pointer flex items-center justify-center h-[16px] w-[16px] rounded-[3px] bg-primary items-center justify-center"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-content-primary bg-bg-section flex items-center h-[30px] min-w-[80px] w-fit rounded-[3px] px-[8px]">
                  Brak aktywnych ustawień
                </p>
              )}
            </div>

            <div className="mb-[24px]">
              <p className="text-[14px] text-content-secondary mb-[10px]">
                Dodaj własne (liczba dni przed terminem)
              </p>
              <div className="flex items-center gap-[16px] max-w-[240px]">
                <Input
                  value={newSetting}
                  onChange={(e) => handleChange(e)}
                  name="setting"
                  placeholder="np.30"
                  className="!min-h-[30px] !rounded-[3px]"
                  isValidate={false}
                />
                <BoardButton
                  className="!min-w-[0px] !w-[30px] !p-0 !h-[30px]"
                  size="small"
                  icon="add"
                  disabled={validateButton()}
                  onClick={() => addSettings()}
                />
              </div>
            </div>
            <div className="">
              <p className="text-[14px] text-content-secondary mb-[10px]">Szybkie ustawienia</p>
              {settings.length > 0 ? (
                <div className="flex items-center gap-[16px] flex-wrap">
                  {settings.map((item) => {
                    return (
                      <button
                        onClick={() => toggleCurrentSettings(item)}
                        key={item.id}
                        className={classNames(
                          'shrink-0 text-[12px] text-dark cursor-pointer bg-info-bg flex items-center h-[30px] w-fit rounded-[3px] px-[8px] hover:bg-primary hover:text-white custom-transition',
                          {
                            ['bg-primary text-white']: currentSettings.includes(item),
                          },
                        )}
                      >
                        {item.value} {formatDays(item.value)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-dark bg-bg-section flex items-center h-[30px] min-w-[80px] w-fit rounded-[3px] px-[8px]">
                  Brak szybkich ustawień
                </p>
              )}
            </div>
          </div>
          <BoardButton className="ml-auto" size="small" onClick={() => {}}>
            Zapisz ustawienia
          </BoardButton>
        </BlockWrapper>
      </GridWrapper>
    </>
  );
}
