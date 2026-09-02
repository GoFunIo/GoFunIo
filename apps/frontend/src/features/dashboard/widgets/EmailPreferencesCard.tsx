import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/dashboard/hooks/notificationCenter.hooks';
import { NotificationCategory } from '@/features/dashboard/types';

import { AlertSwitcher } from '@/features/dashboard/ui/AlertSwitcher';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { notificationCategoryLabels } from '@/utils/formatDeadline';
import { getErrorMessage } from '@/utils/getErrorMessage';

const ALL_CATEGORIES: NotificationCategory[] = [
  'FLEET_DEADLINES',
  'VEHICLE_ACCESS',
  'MEMBERSHIP',
  'SERVICE',
  'PRODUCT',
];

export function EmailPreferencesCard() {
  const { data: preferencesResponse, isLoading: isPreferencesLoading } =
    useNotificationPreferences();
  const updatePreferencesMutation = useUpdateNotificationPreferences();

  const [emailByCategory, setEmailByCategory] = useState<Record<NotificationCategory, boolean>>(
    () =>
      ALL_CATEGORIES.reduce(
        (acc, category) => ({ ...acc, [category]: true }),
        {} as Record<NotificationCategory, boolean>,
      ),
  );
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  useEffect(() => {
    if (!preferencesResponse) return;

    const next = ALL_CATEGORIES.reduce(
      (acc, category) => {
        const pref = preferencesResponse.preferences.find((p) => p.category === category);
        acc[category] = pref ? pref.emailMode === 'IMMEDIATE' : true;
        return acc;
      },
      {} as Record<NotificationCategory, boolean>,
    );

    setEmailByCategory(next);
  }, [preferencesResponse]);

  const toggleCategoryEmail = (category: NotificationCategory, checked: boolean) => {
    setEmailByCategory((prev) => ({ ...prev, [category]: checked }));
  };

  const handleSavePreferences = async () => {
    setPreferencesError(null);

    try {
      await updatePreferencesMutation.mutateAsync({
        preferences: ALL_CATEGORIES.map((category) => ({
          category,
          emailMode: emailByCategory[category] ? 'IMMEDIATE' : 'OFF',
        })),
      });
    } catch (err) {
      setPreferencesError(getErrorMessage(err));
    }
  };

  return (
    <BlockWrapper className="flex flex-col justify-between h-full min-h-[380px]">
      <div>
        <p className="text-[16px] text-content-primary font-bold mb-2">Powiadomienia e-mail</p>
        <p className="text-[13px] text-content-secondary mb-[24px]">
          Wybierz, dla których kategorii wysyłać e-mail. Powiadomienia SMS pojawią się w kolejnej
          wersji.
        </p>

        {isPreferencesLoading ? (
          <p className="text-[12px] text-content-secondary">Ładowanie…</p>
        ) : (
          <div className="flex flex-col gap-[20px]">
            {ALL_CATEGORIES.map((category) => (
              <div key={category} className="flex items-start justify-between w-full gap-4">
                <div className="flex gap-4">
                  <IconWrapper variant="default">
                    <Mail size={18} />
                  </IconWrapper>
                  <div>
                    <p className="text-[14px] text-content-primary font-medium">
                      {notificationCategoryLabels[category]}
                    </p>
                  </div>
                </div>
                <AlertSwitcher
                  checked={emailByCategory[category]}
                  onChange={(checked) => toggleCategoryEmail(category, checked)}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        )}

        {preferencesError && <p className="text-[12px] text-alert mt-[16px]">{preferencesError}</p>}
      </div>

      <div className="flex justify-end mt-auto pt-[24px] w-full">
        <BoardButton
          size="small"
          onClick={handleSavePreferences}
          disabled={updatePreferencesMutation.isPending}
          className="w-full sm:w-auto"
        >
          {updatePreferencesMutation.isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}
        </BoardButton>
      </div>
    </BlockWrapper>
  );
}
