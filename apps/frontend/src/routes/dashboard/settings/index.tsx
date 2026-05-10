import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { getVariantStyles } from '@/utils/getVariantStyles';
import { createFileRoute } from '@tanstack/react-router';
import classNames from 'classnames';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';

export const Route = createFileRoute('/dashboard/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { iconBg, color } = getVariantStyles('info');

  return (
    <>
      <DashboardHeader title="Ustawienia" subtitle="Zarządzaj swoim kontem i subskrypcją." />

      <GridWrapper layout="2-equal">
        <BlockWrapper className="flex justify-between gap-[12px]">
          <div className="">
            <p className="font-bold text-[14px] text-dark pb-[5px]">Adres rozliczeniowy</p>
            <p className="text-[14px] pb-[5px]">Anna KOwalska</p>
            <p className="text-[14px] pb-[5px]">Prosta 1</p>
            <p className="text-[14px] pb-[5px]">00-000 Warszawa</p>
            <p className="text-[14px]">+48 000 000 000</p>
          </div>
          <BoardButton onClick={() => {}} size="small" icon="edit">
            Edytuj
          </BoardButton>
        </BlockWrapper>
        <BlockWrapper variant="info" className="flex justify-between gap-[12px]">
          <div className="">
            <p
              className={classNames(
                'flex items-center font-semibold text-[10px] rounded-full h-[30px] w-fit px-[12px] mb-[12px]',
                color,
                iconBg,
              )}
            >
              7-dniowy okres próbny
            </p>
            <div className="">
              <p className="font-bold text-[14px] text-dark pb-[5px]">
                Pozostało 7 dni darmowego dostępu
              </p>
              <p className="text-[14px]">Aktywuj plan, aby nie stracić dostępu</p>
            </div>
          </div>
          <BoardButton onClick={() => {}} size="small" icon="edit">
            Aktywuj plan
          </BoardButton>
        </BlockWrapper>
      </GridWrapper>

      <GridWrapper layout="2-equal">
        <BlockWrapper className="flex justify-between gap-[12px]">
          <div className="">
            <p className="font-bold text-[14px] text-dark pb-[5px]">Adres mailowy</p>
            <p className="text-[14px]">admin@gmail.com</p>
          </div>
          <BoardButton onClick={() => {}} size="small" icon="edit">
            Zmień
          </BoardButton>
        </BlockWrapper>
      </GridWrapper>

      <GridWrapper layout="2-equal">
        <BlockWrapper className="flex justify-between gap-[12px]">
          <div className="">
            <p className="font-bold text-[14px] text-dark pb-[5px]">Adres mailowy</p>
            <p className="text-[14px] text-icon">• • • • • • • •</p>
          </div>
          <BoardButton onClick={() => {}} size="small" icon="edit">
            Zmień
          </BoardButton>
        </BlockWrapper>
      </GridWrapper>
    </>
  );
}
