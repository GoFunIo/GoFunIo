import { useState } from 'react';
import { UserActions } from '../types';
import { PersonalDataForm } from '../forms/PersonalDataForm';
import { CompanyDataForm } from '../forms/CompanyDataForm';
import { ChangeEmailForm } from '../forms/ChangeEmailForm';
import { ChangePasswordForm } from '../forms/ChangePasswordForm';
import { usePermissions } from './usePermissions';
import { Modal } from '../ui/Modal';

export const useUserModal = () => {
  const { canUpdateCompany } = usePermissions();
  const [activeModal, setActiveModal] = useState<UserActions>(null);

  const openModal = (modal: UserActions) => {
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const getModalConfig = () => {
    switch (activeModal) {
      case 'personal':
        return {
          title: 'Dane osobowe',
          subtitle: 'Wprowadź swoje dane osobowe.',
          content: <PersonalDataForm onClose={() => setActiveModal(null)} />,
        };
      case 'company':
        if (!canUpdateCompany) {
          return { title: '', subtitle: '', content: null };
        }

        return {
          title: 'Dane firmowe',
          subtitle: 'Uzupełnij informacje o firmie potrzebne do wystawiania faktur.',
          content: <CompanyDataForm onClose={() => setActiveModal(null)} />,
        };
      case 'email':
        return {
          title: 'Edytuj adres e-mail',
          subtitle: 'Wprowadź i potwierdź swój nowy adres e-mail.',
          content: <ChangeEmailForm onClose={() => setActiveModal(null)} />,
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

  return {
    openModal,
    closeModal,
    UserModal: (
      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => !isOpen && closeModal()}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    ),
  };
};
