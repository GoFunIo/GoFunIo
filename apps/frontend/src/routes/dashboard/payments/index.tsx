import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { PricingDashboardCard } from '@/features/dashboard/widgets/PricingDashboardCard';
import { Switcher } from '@/features/homepage/ui/Switcher';
import { invoiceColumns, invoiceData } from '@/store/invoiceTable';
import { CreditCard, Receipt, Download } from 'lucide-react';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

export const pricingPlans = [
  {
    id: 1,
    name: 'START',
    description: 'Dla pojedynczego kierowcy z jednym lub dwoma autami.',
    price: { monthly: 29, yearly: 240 },
    buttonText: 'Wybierz plan osobisty',
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
    description: 'Dla tych, którzy chcą mieć pełną kontrolę nad kosztami.',
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
    description: 'Dla firm i flot pojazdów służbowych.',
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

export const Route = createFileRoute('/dashboard/payments/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const userSubscription = {
    planName: 'Pro',
    isTrial: true,
    endDate: '1 lipca 2026',
  };

  const currentPlanText = userSubscription.isTrial
    ? `Okres próbny (${userSubscription.planName})`
    : `Plan ${userSubscription.planName}`;

  return (
    <>
      <DashboardHeader
        title="Wybierz plan dopasowany do Ciebie"
        subtitle="Aktywuj subskrypcję, aby zachować dostęp do wszystkich funkcji po zakończeniu okresu próbnego. Anulujesz w każdej chwili."
      />

      <div className=" flex justify-center">
        <Switcher activeCycle={billingCycle} onChange={setBillingCycle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch pb-15">
        {pricingPlans.map((plan) => (
          <PricingDashboardCard key={plan.id} plan={plan} billingCycle={billingCycle} />
        ))}
      </div>

      {/*  ZARZĄDZAJ SUBSKRYPCJĄ */}
      <div className="bg-bg-card border border-icon rounded-[7px] p-[25px] ">
        <div className="flex items-center gap-4 mb-6">
          <CreditCard className="w-5 h-5 text-content-secondary" />
          <h3 className="font-bold text-[16px] text-content-primary">Zarządzaj subskrypcją</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Aktualny plan - DYNAMICZNY */}
          <div className="border border-icon rounded-[7px] p-4 bg-bg-page/50">
            <span className="text-[12px] font-medium text-content-secondary tracking-wider uppercase">
              Aktualny plan
            </span>
            <p className="font-bold text-[16px] text-content-primary mt-1">{currentPlanText}</p>
            <p className="text-[14px] text-content-secondary mt-1">
              {userSubscription.isTrial ? 'Odnawia się' : 'Ważny do'} {userSubscription.endDate}
            </p>
          </div>

          {/* Status - DYNAMICZNY */}
          <div className="border border-icon rounded-[7px] p-4 bg-bg-page/50">
            <span className="text-[12px] font-medium text-content-secondary tracking-wider uppercase">
              Status
            </span>
            <div className="mt-1">
              <span
                className={`inline-block text-[12px] font-semibold px-2 py-0.5 rounded ${
                  userSubscription.isTrial
                    ? 'bg-warning-bg text-warning'
                    : 'bg-success-bg  text-success'
                }`}
              >
                {userSubscription.isTrial ? 'w trakcie testów' : 'aktywna'}
              </span>
            </div>
            <p className="text-[14px] text-content-secondary mt-2">
              {userSubscription.isTrial
                ? 'Wybierz plan, aby przedłużyć dostęp.'
                : 'Anuluj w każdej chwili — bez ukrytych opłat.'}
            </p>
          </div>
        </div>

        <button className="px-5 h-[45px] border border-alert text-alert hover:bg-alert/5 font-medium text-[14px] rounded-[7px] custom-transition cursor-pointer">
          Anuluj subskrypcję
        </button>
      </div>

      <div className="bg-bg-card border border-icon rounded-[7px] p-5 md:p-8">
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
      </div>
    </>
  );
}
