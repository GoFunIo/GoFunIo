import { Input } from '@/components/ui/Input';
import { AlertSwitcher } from '@/features/dashboard/ui/AlertSwitcher';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { formatDays } from '@/utils/formatDays';
import { createFileRoute } from '@tanstack/react-router';
import classNames from 'classnames';
import { Bell, X, Mail, Smartphone } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/settings/notification')({
  component: RouteComponent,
});

type Settings = {
  id: number | string;
  value: number;
};

const QUICK_TEMPLATES = [60, 30, 14, 7, 3, 1];

function RouteComponent() {
  const [newSetting, setNewSetting] = useState<string>('');

  const [currentSettings, setCurrentSettings] = useState<Settings[]>([
    { id: 1, value: 30 },
    { id: 2, value: 14 },
    { id: 3, value: 7 },
  ]);

  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [smsNotifications, setSmsNotifications] = useState<boolean>(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (/^\d*$/.test(newValue)) {
      setNewSetting(newValue);
    }
  };

  const addSettings = () => {
    const numValue = Number(newSetting);
    if (!newSetting || numValue <= 0) return;

    if (currentSettings.some((s) => s.value === numValue)) {
      setNewSetting('');
      return;
    }

    setCurrentSettings([
      ...currentSettings,
      {
        id: String(Date.now()),
        value: numValue,
      },
    ]);
    setNewSetting('');
  };

  const toggleQuickSetting = (days: number) => {
    const exists = currentSettings.some((s) => s.value === days);

    if (exists) {
      setCurrentSettings(currentSettings.filter((s) => s.value !== days));
    } else {
      setCurrentSettings([
        ...currentSettings,
        {
          id: String(Date.now()) + days,
          value: days,
        },
      ]);
    }
  };

  const removeSetting = (id: number | string) => {
    setCurrentSettings(currentSettings.filter((setting) => setting.id !== id));
  };

  const validateButton = () => {
    const num = Number(newSetting);
    if (newSetting.length === 0 || currentSettings.some((item) => item.value === num)) {
      return true;
    }
    return false;
  };

  const handleResetToDefault = () => {
    setCurrentSettings([
      { id: 1, value: 30 },
      { id: 2, value: 14 },
      { id: 3, value: 7 },
    ]);
  };

  return (
    <>
      <GridWrapper layout="2-equal">
        {/* LEWA KARTA: PRZYPOMNIENIA O TERMINACH */}
        <BlockWrapper className="flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-[8px] mb-[16px]">
              <IconWrapper variant="default">
                <Bell className="text-primary" size={18} />
              </IconWrapper>
              <p className="text-[16px] text-content-primary font-bold">
                Przypomnienia o terminach
              </p>
            </div>
            <p className="text-[16px] text-content-secondary mb-[24px]">
              Możesz ustawić dowolnie wiele przypomnień
            </p>

            <div className="mb-[24px]">
              <p className="text-[14px] text-content-secondary mb-[10px]">Aktywne ustawienia</p>
              {currentSettings.length > 0 ? (
                <div className="flex items-center gap-[16px] flex-wrap">
                  {[...currentSettings]
                    .sort((a, b) => b.value - a.value)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="shrink-0 bg-info-bg flex gap-[8px] items-center h-[30px] w-fit rounded-[3px] px-[8px]"
                      >
                        <p className="text-[12px] text-dark font-medium">
                          {item.value} {formatDays(item.value)}
                        </p>
                        <button
                          onClick={() => removeSetting(item.id)}
                          className="cursor-pointer flex items-center justify-center h-[16px] w-[16px] rounded-[3px] bg-primary transition-colors hover:bg-secondary"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="bg-bg-section p-[12px] rounded-[3px] w-full border border-icon/40">
                  <p className="text-[12px] text-content-secondary leading-normal">
                    Brak aktywnych przypomnień. Dodaj poniżej liczbę dni, na ile wcześniej chcesz
                    otrzymać powiadomienie.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-[24px]">
              <p className="text-[14px] text-content-secondary">
                Dodaj własne (liczba dni przed terminem)
              </p>
              <div className="flex items-center gap-[16px] max-w-[300px]">
                <Input
                  value={newSetting}
                  onChange={handleChange}
                  name="setting"
                  placeholder="np.30 dni"
                  isValidate={false}
                />
                <BoardButton
                  className="!h-[45px] !w-[45px] mt-[20px]"
                  size="square"
                  icon="add"
                  disabled={validateButton()}
                  onClick={addSettings}
                />
              </div>
            </div>

            <div className="mb-[32px]">
              <p className="text-[14px] text-content-secondary mb-[10px]">Szybkie ustawienia</p>
              <div className="flex items-center gap-[12px] flex-wrap">
                {QUICK_TEMPLATES.map((days, idx) => {
                  const isSelected = currentSettings.some((s) => s.value === days);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleQuickSetting(days)}
                      className={classNames(
                        'shrink-0 text-[12px] cursor-pointer h-[30px] w-fit rounded-[3px] px-[12px] custom-transition font-medium',
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-info-bg text-dark hover:bg-primary/10',
                      )}
                    >
                      {days} {formatDays(days)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-icon pt-[24px] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-[12px] sm:gap-[16px] mt-auto w-full">
            <BoardButton
              variant="outline"
              size="small"
              onClick={handleResetToDefault}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Przywróć domyślne
            </BoardButton>
            <BoardButton
              size="small"
              onClick={() => console.log('Zapisano ustawienia:', currentSettings)}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Zapisz ustawienia
            </BoardButton>
          </div>
        </BlockWrapper>

        {/* PRAWA KARTA: KANAŁY POWIADOMIEŃ */}
        <BlockWrapper className="flex flex-col justify-between h-full min-h-[380px]">
          <div>
            <p className="text-[16px] text-content-primary font-bold mb-[24px]">
              Kanały powiadomień
            </p>

            <div className="flex flex-col gap-[24px]">
              <div className="flex items-start justify-between w-full gap-4">
                <div className="flex flex-col  sm:flex-row gap-4">
                  <IconWrapper variant="default">
                    <Mail size={18} />
                  </IconWrapper>
                  <div>
                    <p className="text-[14px] text-content-primary font-medium">
                      Powiadomienia e-mail
                    </p>
                    <p className="text-[12px] text-content-secondary mt-[2px]">
                      Wyślij przypomnienie na powiązany adres e-mail
                    </p>
                  </div>
                </div>
                <AlertSwitcher
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                  className="mt-2"
                />
              </div>

              <div className="flex  items-start justify-between w-full gap-4">
                <div className="flex flex-col  sm:flex-row gap-4">
                  <IconWrapper variant="default">
                    <Smartphone size={18} />
                  </IconWrapper>
                  <div>
                    <p className="text-[14px] text-content-primary font-medium">
                      Powiadomienia SMS na telefon
                    </p>
                    <p className="text-[12px] text-content-secondary mt-[2px]">
                      Wyślij alert tekstowy bezpośrednio na Twój numer telefonu
                    </p>
                  </div>
                </div>
                <AlertSwitcher
                  checked={smsNotifications}
                  onChange={setSmsNotifications}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-auto pt-[24px] w-full">
            <BoardButton
              size="small"
              onClick={() => console.log('Zapisano kanały')}
              className="w-full sm:w-auto"
            >
              Zapisz ustawienia
            </BoardButton>
          </div>
        </BlockWrapper>
      </GridWrapper>
    </>
  );
}
