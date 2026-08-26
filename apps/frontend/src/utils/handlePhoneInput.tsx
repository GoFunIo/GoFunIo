export const handlePhoneInput = (value: string) => {
  return value.replace(/[^\d+\s\-()]/g, '');
};

export const handlePriceInput = (value: string) => {
  return value
    .replace(/[^\d.,]/g, '')
    .replace(/([.,]).*[.,]/g, '$1')
    .replace(/^(\d*[.,]\d{0,2}).*$/, '$1');
};
