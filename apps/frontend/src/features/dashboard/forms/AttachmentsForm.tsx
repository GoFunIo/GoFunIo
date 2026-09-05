import { useError } from '@/hooks/useError';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import {
  useCreateServiceAttachment,
  useDeleteServiceAttachment,
  useUpdateServiceAttachment,
} from '../hooks/attachments.hooks';
import { AttachmentData } from '../types/AttachmentTypes';
import { Attachments } from '../widgets/Attachments';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { downloadServiceAttachment } from '../api/attachments.api';

type BaseProps = {
  attachments: AttachmentData[];
  serviceId?: string;
  className?: string;
};

type Props = BaseProps &
  (
    | {
        mode: 'local';
        onChange: (attachments: AttachmentData[]) => void;
      }
    | {
        mode: 'api';
      }
  );

export const AttachmentsForm = (props: Props) => {
  const { attachments, className, mode, serviceId } = props;
  const { error, setError } = useError();

  const { mutateAsync: createAttachment } = useCreateServiceAttachment();
  const { mutateAsync: replaceAttachment } = useUpdateServiceAttachment();
  const { mutateAsync: deleteAttachment } = useDeleteServiceAttachment();

  const handleAddFile = async (file: File) => {
    if (attachments.length >= MAX_FILES_PER_UPLOAD) {
      return;
    }

    if (mode === 'local') {
      const attachment: AttachmentData = {
        file,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString().split('T')[0],
      };

      props.onChange([...attachments, attachment]);
      return;
    }

    if (!props.serviceId) return;

    try {
      await createAttachment({
        serviceId: props.serviceId,
        file,
      });
    } catch (error) {
      setError(
        getErrorMessage(error, {
          400: 'Brak załącznika lub nieprawidłowa zawartość',
          403: 'Brak uprawnień do tego zasobu lub operacji.',
          404: 'Pojazd lub serwis nie został znaleziony.',
          503: 'Magazyn załączników jest niedostępny',
        }),
      );
    }
  };

  const handleDownloadFile = async (index: number) => {
    const attachment = attachments[index];

    if (!attachment.id || !serviceId) return;

    try {
      await downloadServiceAttachment(serviceId, attachment.id);
    } catch (error) {
      setError(
        getErrorMessage(error, {
          400: 'Brak załącznika lub nieprawidłowa zawartość',
          403: 'Brak uprawnień do tego zasobu lub operacji.',
          404: 'Załącznik nie został znaleziony.',
          503: 'Magazyn załączników jest niedostępny',
        }),
      );
    }
  };

  const handleUpdateFile = async (index: number, file: File) => {
    const attachment = attachments[index];

    if (mode === 'local') {
      const updatedAttachment: AttachmentData = {
        ...attachment,
        file,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString().split('T')[0],
      };

      props.onChange(attachments.map((item, i) => (i === index ? updatedAttachment : item)));

      return;
    }

    if (!attachment.id || !serviceId) return;

    try {
      await replaceAttachment({
        serviceId: serviceId,
        attachmentId: attachment.id,
        file,
      });
    } catch (error) {
      setError(
        getErrorMessage(error, {
          400: 'Brak załącznika lub nieprawidłowa zawartość',
          403: 'Brak uprawnień do tego zasobu lub operacji.',
          404: 'Pojazd lub serwis nie został znaleziony.',
          503: 'Magazyn załączników jest niedostępny',
        }),
      );
    }
  };

  const handleDeleteFile = async (index: number) => {
    const attachment = attachments[index];

    if (mode === 'local') {
      props.onChange(attachments.filter((_, i) => i !== index));
      return;
    }

    if (!attachment.id || !serviceId) return;

    try {
      await deleteAttachment({
        serviceId,
        attachmentId: attachment.id,
      });
    } catch (error) {
      setError(
        getErrorMessage(error, {
          403: 'Brak uprawnień do tego zasobu lub operacji.',
          404: 'Pojazd lub serwis nie został znaleziony.',
        }),
      );
    }
  };

  return (
    <Attachments
      attachments={attachments}
      onAdd={handleAddFile}
      onEdit={handleUpdateFile}
      onDelete={handleDeleteFile}
      onDownload={handleDownloadFile}
      className={className}
      error={error}
    />
  );
};
