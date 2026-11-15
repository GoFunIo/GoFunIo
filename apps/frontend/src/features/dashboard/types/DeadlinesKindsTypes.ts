export type SelectDeadlineKindType = {
  id: string;
  value: string;
  label: string;
};

export type DeadlineKindType = {
  key: string; // 'OC' | 'AC' | 'TECHNICAL_INSPECTION' | uuid
  label: string; // 1-60 znaków
  builtIn: boolean; // wbudowanych nie można zmieniać ani usuwać
};

export type CreateDeadlineKindData = {
  label: string;
};

export type RenameDeadlineKindData = {
  label: string;
};
