import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import {
  useCreateServiceAttachment,
  useDeleteServiceAttachment,
  useUpdateServiceAttachment,
} from '../hooks/attachments.hooks';
import { AttachmentData } from '../types/AttachmentTypes';
import { Attachments } from '../widgets/Attachments';

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

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const AttachmentsForm = (props: Props) => {
  const { attachments, className, mode, serviceId } = props;

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

    await createAttachment({
      serviceId: props.serviceId,
      file,
    });
  };

  const handleDownloadFile = (index: number) => {
    const attachment = attachments[index];

    if (!attachment.id || !serviceId) return;

    window.location.href = `${API_URL}/services/${serviceId}/attachments/${attachment.id}`;
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

    await replaceAttachment({
      serviceId: serviceId,
      attachmentId: attachment.id,
      file,
    });
  };

  const handleDeleteFile = async (index: number) => {
    const attachment = attachments[index];

    if (mode === 'local') {
      props.onChange(attachments.filter((_, i) => i !== index));
      return;
    }

    if (!attachment.id || !serviceId) return;

    await deleteAttachment({
      serviceId,
      attachmentId: attachment.id,
    });
  };

  return (
    <Attachments
      attachments={attachments}
      onAdd={handleAddFile}
      onEdit={handleUpdateFile}
      onDelete={handleDeleteFile}
      onDownload={handleDownloadFile}
      className={className}
    />
  );
};
