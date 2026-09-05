import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { CalendarClock, Lock } from 'lucide-react';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import {
  useAlertPolicy,
  useUpdateAlertPolicy,
} from '@/features/dashboard/hooks/notificationCenter.hooks';
import { DeadlineKind } from '@/features/dashboard/types';

import { Input } from '@/components/ui/Input';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { Select } from '@/features/dashboard/ui/Select';
import { formatDays } from '@/utils/formatDays';
import { deadlineKindLabels } from '@/utils/formatDeadline';
import { getErrorMessage } from '@/utils/getErrorMessage';

const DEFAULT_LEAD_DAYS = [30, 14, 7, 0];
const ALL_DEADLINE_KINDS: DeadlineKind[] = ['OC', 'AC', 'TECHNICAL_INSPECTION'];

const TIMEZONE_OPTIONS = [
  { id: 1, value: 'Europe/Warsaw', label: 'Europe/Warsaw (Polska)' },
  { id: 2, value: 'Europe/London', label: 'Europe/London' },
  { id: 3, value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { id: 4, value: 'UTC', label: 'UTC' },
];

export function AlertPolicyCard() {
  const { canManageAlertPolicy } = usePermissions();

  const { data: policy, isLoading: isPolicyLoading } = useAlertPolicy();
  const updatePolicyMutation = useUpdateAlertPolicy();

  const [newSetting, setNewSetting] = useState<string>('');
  const [leadDays, setLeadDays] = useState<number[]>(DEFAULT_LEAD_DAYS);
  const [enabledKinds, setEnabledKinds] = useState<DeadlineKind[]>(ALL_DEADLINE_KINDS);
  const [timeZone, setTimeZone] = useState<string>('Europe/Warsaw');
  const [policyError, setPolicyError] = useState<string | null>(null);

  useEffect(() => {
    if (!policy) return;

    setLeadDays(policy.leadDays);
    setEnabledKinds(policy.enabledDeadlineKinds);
    setTimeZone(policy.timeZone);
  }, [policy]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (/^\d*$/.test(newValue)) {
      setNewSetting(newValue);
    }
  };

  const addSetting = () => {
    const numValue = Number(newSetting);
    if (!newSetting || numValue < 0 || numValue > 365) return;

    if (leadDays.includes(numValue)) {
      setNewSetting('');
      return;
    }

    setLeadDays([...leadDays, numValue]);
    setNewSetting('');
  };

  const removeSetting = (day: number) => {
    setLeadDays((prev) => prev.filter((d) => d !== day));
  };

  const toggleDeadlineKind = (kind: DeadlineKind) => {
    setEnabledKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  };

  const validateAddButton = () => {
    const num = Number(newSetting);
    if (newSetting.length === 0 || leadDays.includes(num) || num > 365) {
      return true;
    }
    return false;
  };

  const handleResetToDefault = () => {
    setLeadDays(DEFAULT_LEAD_DAYS);
  };

  const handleSavePolicy = async () => {
    setPolicyError(null);

    try {
      await updatePolicyMutation.mutateAsync({
        leadDays,
        enabledDeadlineKinds: enabledKinds,
        timeZone,
      });
    } catch (err) {
      setPolicyError(getErrorMessage(err));
    }
  };

  return (
    <BlockWrapper className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-[8px] mb-4">
          <IconWrapper variant="default">
            <CalendarClock className="text-primary" size={18} />
          </IconWrapper>
          <p className="text-[16px] text-content-primary font-bold">Przypomnienia o terminach</p>
          {!canManageAlertPolicy && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-content-secondary">
              <Lock size={12} /> tylko podgląd
            </span>
          )}
        </div>
        <p className="text-[16px] text-content-secondary mb-6">
          Ustaw, ile dni przed terminem OC/AC/przeglądu ma powstać powiadomienie.
        </p>

        <div className="mb-6">
          <p className="text-[14px] text-content-secondary mb-[10px]">Aktywne progi</p>
          {isPolicyLoading ? (
            <p className="text-[12px] text-content-secondary">Ładowanie…</p>
          ) : leadDays.length > 0 ? (
            <div className="flex items-center gap-4 flex-wrap">
              {[...leadDays]
                .sort((a, b) => b - a)
                .map((day) => (
                  <div
                    key={day}
                    className="shrink-0 bg-info-bg flex gap-[8px] items-center h-[30px] w-fit rounded-[3px] px-[8px]"
                  >
                    <p className="text-[12px] text-dark font-medium">
                      {day === 0 ? 'Dzień terminu' : `${day} ${formatDays(day)}`}
                    </p>
                    {canManageAlertPolicy && (
                      <button
                        onClick={() => removeSetting(day)}
                        className="cursor-pointer flex items-center justify-center h-[16px] w-[16px] rounded-[3px] bg-primary text-white transition-colors hover:bg-secondary"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-bg-section p-[12px] rounded-[3px] w-full border border-icon/40">
              <p className="text-[12px] text-content-secondary leading-normal">
                Brak aktywnych progów. Bez nich Notifications nie będą tworzone.
              </p>
            </div>
          )}
        </div>

        {canManageAlertPolicy && (
          <>
            <div className="mb-8">
              <p className="text-[14px] text-content-secondary">
                Dodaj własny próg (0–365 dni przed terminem)
              </p>
              <div className="flex items-center gap-4 max-w-[300px]">
                <Input
                  value={newSetting}
                  onChange={handleChange}
                  name="setting"
                  placeholder="np. 30 dni"
                  isValidate={false}
                />
                <BoardButton
                  className="!h-[45px] !w-[45px] mt-[20px]"
                  size="square"
                  icon="add"
                  disabled={validateAddButton()}
                  onClick={addSetting}
                />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[14px] text-content-secondary mb-[10px]">
                Aktywne rodzaje terminów
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {ALL_DEADLINE_KINDS.map((kind) => {
                  const isSelected = enabledKinds.includes(kind);

                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => toggleDeadlineKind(kind)}
                      className={classNames(
                        'shrink-0 text-[12px] cursor-pointer h-[30px] w-fit rounded-[3px] px-3 custom-transition font-medium',
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-info-bg text-dark hover:bg-secondary hover:text-white',
                      )}
                    >
                      {deadlineKindLabels[kind]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 max-w-[280px]">
              <p className="text-[14px] text-content-secondary mb-[10px]">
                Strefa czasowa naliczania terminów
              </p>
              <Select
                value={timeZone}
                onChange={(value) => setTimeZone(String(value))}
                options={TIMEZONE_OPTIONS}
              />
            </div>
          </>
        )}

        {policyError && <p className="text-[12px] text-alert mt-[12px]">{policyError}</p>}
      </div>

      {canManageAlertPolicy && (
        <div className="  flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-[12px] sm:gap-[16px] mt-auto w-full">
          <BoardButton
            variant="outline"
            size="small"
            onClick={handleResetToDefault}
            disabled={updatePolicyMutation.isPending}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Przywróć domyślne
          </BoardButton>
          <BoardButton
            size="small"
            onClick={handleSavePolicy}
            disabled={updatePolicyMutation.isPending}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {updatePolicyMutation.isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}
          </BoardButton>
        </div>
      )}
    </BlockWrapper>
  );
}
