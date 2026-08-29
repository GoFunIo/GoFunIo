import { Download, Paperclip, Pencil, Trash2, Upload } from 'lucide-react';

import { AttachmentData } from '../types/AttachmentTypes';

import { formatFileSize, formatFileType } from '@/utils/formatFile';

import classNames from 'classnames';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import { useRef } from 'react';

type Props = {
  attachments: AttachmentData[];
  onAdd?: (file: File) => void;
  onEdit?: (index: number, file: File) => void;
  onDelete: (index: number) => void;
  onDownload?: (index: number) => void;
  className?: string;
};

export const Attachments = ({
  attachments,
  className,
  onAdd,
  onDelete,
  onDownload,
  onEdit,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    onAdd?.(file);

    event.target.value = '';
  };

  return (
    <div className={classNames('flex flex-col gap-3', className)}>
      {onAdd && attachments.length < MAX_FILES_PER_UPLOAD && (
        <div className="">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAddFile}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer w-full h-[45px] border border-dashed border-icon rounded-[7px] flex items-center justify-center gap-2 text-content-secondary hover:border-secondary hover:text-secondary custom-transition text-[14px]"
          >
            <Upload size={16} />
            Załącz dokumenty z dysku
          </button>
        </div>
      )}
      {attachments.map((item, index) => {
        const isExisting = 'id' in item;

        return (
          <div key={`${item.name}-${item.size}-${index}`} className="flex items-center gap-3">
            <Paperclip size={21} className="text-content-secondary shrink-0" />

            <div>
              <p className="text-[14px] text-content-secondary">{item.name}</p>

              <p className="text-[14px] text-content-secondary">
                {formatFileSize(item.size)} · {formatFileType(item.mimeType)} · {item.createdAt}
              </p>
            </div>

            <div className="flex gap-2 ml-auto">
              {isExisting && onDownload && (
                <button className="cursor-pointer" type="button" onClick={() => onDownload(index)}>
                  <Download size={21} className="text-content-secondary" />
                </button>
              )}

              {isExisting && onEdit && (
                <label htmlFor={`attachment-${index}`} className="cursor-pointer">
                  <Pencil size={21} className="text-content-secondary" />

                  <input
                    id={`attachment-${index}`}
                    type="file"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (!file) return;

                      onEdit(index, file);
                      event.target.value = '';
                    }}
                  />
                </label>
              )}

              <button type="button" className="cursor-pointer" onClick={() => onDelete(index)}>
                <Trash2 size={21} className="text-content-secondary" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
