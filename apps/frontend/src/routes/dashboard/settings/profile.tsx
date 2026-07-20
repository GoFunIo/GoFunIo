import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { PersonalDataForm } from '@/features/dashboard/forms/PersonalDataForm';
import { CompanyDataForm } from '@/features/dashboard/forms/CompanyDataForm';
import { ChangeEmailForm } from '@/features/dashboard/forms/ChangeEmailForm';
import { ChangePasswordForm } from '@/features/dashboard/forms/ChangePasswordForm';
import { useUser } from '@/hooks/useUser';
import { useCompany } from '@/hooks/useCompany';

export const Route = createFileRoute('/dashboard/settings/profile')({
  component: RouteComponent,
});

type ModalType = 'personal' | 'company' | 'email' | 'password' | null;

function RouteComponent() {
  const { data: user } = useUser();
  const { data: company } = useCompany();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const userPersonalDataLines = [
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : null,
    user.address,
    user.postalCode || user.city ? `${user.postalCode ?? ''} ${user.city ?? ''}`.trim() : null,
    user.phone,
  ];
  console.log(userPersonalDataLines);
  const userCompanyDataLines = [
    company?.name,
    company?.taxId ? `NIP: ${company.taxId}` : null,
    company?.address,
    company?.postalCode || company?.city
      ? `${company?.postalCode ?? ''} ${company?.city ?? ''}`.trim()
      : null,
  ];

  // Dynamiczna konfiguracja modalu w zależności od wybranego trybu
  const getModalConfig = () => {
    switch (activeModal) {
      case 'personal':
        return {
          title: 'Dane osobowe',
          subtitle: 'Wprowadź swoje dane osobowe.',
          content: <PersonalDataForm onClose={() => setActiveModal(null)} />,
        };
      case 'company':
        return {
          title: 'Dane firmowe',
          subtitle: 'Uzupełnij informacje o firmie potrzebne do wystawiania faktur.',
          content: <CompanyDataForm onClose={() => setActiveModal(null)} />,
        };
      case 'email':
        return {
          title: 'Edytuj adres e-mail',
          subtitle: 'Wprowadź i potwierdź swój nowy adres e-mail.',
          content: (
            <ChangeEmailForm currentEmail={user.email} onClose={() => setActiveModal(null)} />
          ),
        };
      case 'password':
        return {
          title: 'Edytuj hasło',
          subtitle: 'Zmień swoje dotychczasowe hasło na nowe, bezpieczniejsze.',
          content: <ChangePasswordForm onClose={() => setActiveModal(null)} />,
        };
      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const modalConfig = getModalConfig();

  return (
    <>
      <GridWrapper layout="2-equal" className="gap-[20px]">
        {/* 1. DANE UŻYTKOWNIKA  */}
        <BlockWrapper className="flex justify-between gap-[12px] order-1">
          <div>
            <p className="font-bold text-[14px] text-content-primary pb-[12px]">Dane użytkownika</p>
            {!userPersonalDataLines.some(Boolean) ? (
              <p className="text-[14px] text-content-secondary pb-[5px] last:pb-0">
                Brak uzupełnionych danych osobowych.
              </p>
            ) : (
              userPersonalDataLines.map((item, index) => {
                if (!item) return null;

                return (
                  <p key={index} className="text-[14px] text-content-secondary pb-[5px] last:pb-0">
                    {item}
                  </p>
                );
              })
            )}
          </div>
          <BoardButton onClick={() => setActiveModal('personal')} size="small" icon="edit">
            Edytuj
          </BoardButton>
        </BlockWrapper>

        {/* 2. DANE FIRMOWE  */}
        <BlockWrapper className="flex justify-between gap-[12px] order-2 ">
          <div>
            <p className="font-bold text-[14px] text-content-primary pb-[12px]">Dane firmowe</p>
            {!userCompanyDataLines.some(Boolean) ? (
              <p className="text-[14px] text-content-secondary pb-[5px] last:pb-0">
                Brak uzupełnionych danych firmowych.
              </p>
            ) : (
              userCompanyDataLines.map((item, index) => {
                if (!item) return null;

                return (
                  <p key={index} className="text-[14px] text-content-secondary pb-[5px] last:pb-0">
                    {item}
                  </p>
                );
              })
            )}
          </div>
          <BoardButton onClick={() => setActiveModal('company')} size="small" icon="edit">
            Edytuj
          </BoardButton>
        </BlockWrapper>

        {/* 3. ADRES E-MAIL  */}
        <BlockWrapper className="flex justify-between gap-[12px] order-3 ">
          <div>
            <p className="font-bold text-[14px] text-content-primary pb-[12px]">Adres e-mail</p>
            <p className="text-[14px] text-content-secondary">{user.email}</p>
          </div>
          <BoardButton onClick={() => setActiveModal('email')} size="small" icon="edit">
            Zmień
          </BoardButton>
        </BlockWrapper>

        {/* 4. HASŁO */}
        <BlockWrapper className="flex justify-between gap-[12px] order-4 ">
          <div>
            <p className="font-bold text-[14px] text-content-primary pb-[12px]">Hasło</p>
            <p className="text-[14px] text-icon tracking-[3px]">• • • • • • • •</p>
          </div>
          <BoardButton onClick={() => setActiveModal('password')} size="small" icon="edit">
            Zmień
          </BoardButton>
        </BlockWrapper>
      </GridWrapper>

      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => !isOpen && setActiveModal(null)}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    </>
  );
}
