import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PricingDashboardCard } from '@/features/dashboard/widgets/PricingDashboardCard';
import { Switcher } from '@/features/homepage/ui/Switcher';
import { invoiceColumns, invoiceData } from '@/store/invoiceTable';
import { CreditCard, Receipt, Download } from 'lucide-react';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';

export const pricingPlans = [
  {
    id: 1,
    name: 'START',
    price: { monthly: 29, yearly: 240 },
    buttonText: 'Aktywuj plan osobisty',
    features: [
      'Do 2 pojazdów',
      'Przypomnienia o OC, AC i przeglądach',
      'Pełna cyfrowa historia serwisowa',
      'Przechowywanie zdjęć dokumentów',
      'Wsparcie mailowe',
    ],
    highlight: false,
  },
  {
    id: 2,
    name: 'PRO',
    price: { monthly: 59, yearly: 580 },
    buttonText: 'Aktywuj PRO',
    features: [
      'Do 10 pojazdów',
      'Przypomnienia o OC, AC i przeglądach',
      'Analityka kosztów',
      'Eksport faktur do PDF',
      'Wsparcie mailowe',
    ],
    highlight: true,
  },
  {
    id: 3,
    name: 'BUSINESS',
    price: { monthly: 99, yearly: 990 },
    buttonText: 'Aktywuj Business',
    features: [
      'Nielimitowana liczba pojazdów',
      'Przypomnienia o OC, AC i przeglądach',
      'Pełna cyfrowa historia serwisowa',
      'Przechowywanie zdjęć dokumentów',
      'Wsparcie mailowe',
    ],
    highlight: false,
  },
];

const USER_SUBSCRIPTION_MOCK = {
  planName: 'Pro',
  isTrial: true,
  endDate: '2026-06-12',
  endDateFormatted: '12 czerwca 2026',
};

export const Route = createFileRoute('/dashboard/settings/payments')({
  component: RouteComponent,
});

function RouteComponent() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const trialDaysResult = calculateDaysToDate(USER_SUBSCRIPTION_MOCK.endDate);
  const daysLeft = trialDaysResult.days;

  const labelText = (() => {
    if (USER_SUBSCRIPTION_MOCK.isTrial) {
      return daysLeft < 0 ? 'Wygasł' : 'Wygasa';
    }
    return 'Ważny do';
  })();

  const subscriptionStatus: 'info' | 'warning' | 'alert' = (() => {
    if (daysLeft < 0) return 'alert';
    if (daysLeft <= 7) return 'warning';
    return 'info';
  })();

  const currentPlanText = USER_SUBSCRIPTION_MOCK.isTrial
    ? `Okres próbny (${USER_SUBSCRIPTION_MOCK.planName})`
    : `Plan ${USER_SUBSCRIPTION_MOCK.planName}`;

  return (
    <>
      {/* SEKCJA BANERÓW SUBSKRYPCJI */}
      {subscriptionStatus === 'info' && (
        <Banner
          variant="info"
          title={`Plan ${USER_SUBSCRIPTION_MOCK.planName}`}
          subtitle={`Plan aktywny do ${USER_SUBSCRIPTION_MOCK.endDateFormatted}`}
          showButton={false}
        />
      )}

      {subscriptionStatus === 'warning' && (
        <Banner
          variant="warning"
          title={`Okres próbny: pozostało ${daysLeft} dni`}
          subtitle="Aktywuj plan, aby nie stracić dostępu do zarządzania flotą."
          showButton={false}
        />
      )}

      {subscriptionStatus === 'alert' && (
        <Banner
          variant="alert"
          title="Okres próbny zakończył się"
          subtitle="Aplikacja działa w trybie tylko do odczytu — wybierz jeden z poniższych planów, aby odblokować pełne funkcje."
          showButton={false}
        />
      )}

      {/* SEKCJA CENNIKA */}
      <div className=" flex justify-center">
        <Switcher activeCycle={billingCycle} onChange={setBillingCycle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
        {pricingPlans.map((plan) => (
          <PricingDashboardCard key={plan.id} plan={plan} billingCycle={billingCycle} />
        ))}
      </div>

      {/* SEKCJA ZARZADZANIA SUBSKRYPCJA*/}
      <BlockWrapper>
        <div className="flex items-center gap-4 mb-6">
          <CreditCard className="w-5 h-5 text-content-secondary" />
          <h3 className="font-bold text-[16px] text-content-primary">Zarządzaj subskrypcją</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-icon rounded-[7px] p-4 bg-bg-page/50">
            <span className="text-[12px] font-medium text-content-secondary tracking-wider uppercase">
              Aktualny plan
            </span>
            <p className="font-bold text-[16px] text-content-primary mt-1">{currentPlanText}</p>
            <p className="text-[14px] text-content-secondary mt-1">
              {labelText} {USER_SUBSCRIPTION_MOCK.endDateFormatted}
            </p>
          </div>

          <div className="border border-icon rounded-[7px] p-4 bg-bg-page/50">
            <span className="text-[12px] font-medium text-content-secondary tracking-wider uppercase">
              Status
            </span>
            <div className="mt-1">
              <span
                className={`inline-block text-[12px] font-semibold px-2 py-0.5 rounded ${
                  USER_SUBSCRIPTION_MOCK.isTrial
                    ? daysLeft < 0
                      ? 'bg-alert/10 text-alert'
                      : 'bg-warning-bg text-warning'
                    : 'bg-success-bg text-success'
                }`}
              >
                {USER_SUBSCRIPTION_MOCK.isTrial
                  ? daysLeft < 0
                    ? 'zakończony'
                    : 'w trakcie testów'
                  : 'aktywna'}
              </span>
            </div>
            <p className="text-[14px] text-content-secondary mt-2">
              {USER_SUBSCRIPTION_MOCK.isTrial
                ? daysLeft < 0
                  ? 'Wybierz plan, aby odzyskać dostęp.'
                  : 'Wybierz plan, aby przedłużyć dostęp.'
                : 'Anuluj w każdej chwili — bez ukrytych opłat.'}
            </p>
          </div>
        </div>

        {!USER_SUBSCRIPTION_MOCK.isTrial && (
          <button className="px-5 h-[45px] border border-alert text-alert hover:bg-alert/5 font-medium text-[14px] rounded-[7px] custom-transition cursor-pointer">
            Anuluj subskrypcję
          </button>
        )}
      </BlockWrapper>

      {/* SEKCJA HISTORII FV */}
      <BlockWrapper>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-content-secondary" />
              <h3 className="font-bold text-[18px] text-content-primary">Historia faktur</h3>
            </div>
            <p className="text-[14px] text-content-secondary">
              Pobieraj faktury VAT do swojej księgowości w dowolnym momencie.
            </p>
          </div>

          <BoardButton type="button" variant="default" size="big">
            <Download className="w-4 h-4" />
            Pobierz wszystko
          </BoardButton>
        </div>

        <DataTable columns={invoiceColumns} data={invoiceData} footer={false} />

        <p className="text-[12px] text-icon mt-4">
          Faktury wystawiane są automatycznie po każdej opłaconej płatności i wysyłane na Twój
          e-mail.
        </p>
      </BlockWrapper>
    </>
  );
}
