export type AttachmentData = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type FormAttachment =
  | {
      type: 'existing';
      id: string;
      name: string;
      mimeType: string;
      size: number;
      createdAt: string;
    }
  | {
      type: 'new';
      file: File;
      name: string;
      mimeType: string;
      size: number;
      createdAt: string;
    };
