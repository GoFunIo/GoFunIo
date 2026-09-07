import { createFileRoute } from '@tanstack/react-router';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useUser } from '@/features/dashboard/hooks/user.hooks';
import { useCompany } from '@/features/dashboard/hooks/company.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { useUserModal } from '@/features/dashboard/hooks/useUserModal';

export const Route = createFileRoute('/dashboard/settings/profile')({
  component: RouteComponent,
});

function RouteComponent() {
  const { canUpdateCompany } = usePermissions();
  const { openModal, UserModal } = useUserModal();
  const { data: user } = useUser();
  const { data: company, isPending: pendingCompany } = useCompany();

  const userPersonalDataLines = [
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : null,
    user.address,
    user.postalCode || user.city ? `${user.postalCode ?? ''} ${user.city ?? ''}`.trim() : null,
    user.phone,
  ];

  const userCompanyDataLines = [
    company?.name,
    company?.taxId ? `NIP: ${company.taxId}` : null,
    company?.address,
    company?.postalCode || company?.city
      ? `${company?.postalCode ?? ''} ${company?.city ?? ''}`.trim()
      : null,
  ];

  return (
    <>
      <GridWrapper layout="2-equal" className="gap-[20px]">
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
          <BoardButton onClick={() => openModal('personal')} size="small" icon="edit">
            Edytuj
          </BoardButton>
        </BlockWrapper>

        <BlockWrapper className="flex justify-between gap-[12px] order-2 ">
          {pendingCompany ? (
            <LoadingIcon className="m-auto" />
          ) : (
            <>
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
                      <p
                        key={index}
                        className="text-[14px] text-content-secondary pb-[5px] last:pb-0"
                      >
                        {item}
                      </p>
                    );
                  })
                )}
              </div>
              {canUpdateCompany && (
                <BoardButton onClick={() => openModal('company')} size="small" icon="edit">
                  Edytuj
                </BoardButton>
              )}
            </>
          )}
        </BlockWrapper>

        <BlockWrapper className="flex justify-between gap-[12px] order-3 ">
          <div>
            <p className="font-bold text-[14px] text-content-primary pb-[12px]">Adres e-mail</p>
            <p className="text-[14px] text-content-secondary">{user.email}</p>
          </div>
          <BoardButton onClick={() => openModal('email')} size="small" icon="edit">
            Zmień
          </BoardButton>
        </BlockWrapper>

        <BlockWrapper className="flex justify-between gap-[12px] order-4 ">
          <div>
            <p className="font-bold text-[14px] text-content-primary pb-[12px]">Hasło</p>
            <p className="text-[14px] text-icon tracking-[3px]">• • • • • • • •</p>
          </div>
          <BoardButton onClick={() => openModal('password')} size="small" icon="edit">
            Zmień
          </BoardButton>
        </BlockWrapper>
      </GridWrapper>

      {UserModal}
    </>
  );
}
