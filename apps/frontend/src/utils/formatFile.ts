export const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(2)} MB`;

  return `${(size / 1024 ** 3).toFixed(2)} GB`;
};

export const formatFileDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('pl-PL');
};

export const formatFileType = (fileType: string) => {
  return fileType.split('/')[1]?.toUpperCase();
};

export const formatDate = (date?: Date) => {
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
