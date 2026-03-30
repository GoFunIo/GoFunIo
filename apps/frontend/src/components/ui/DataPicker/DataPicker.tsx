import { DayPicker } from 'react-day-picker';
// import "react-day-picker/dist/style.css";

type Props = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
};

export const DataPicker = ({ selected, onSelect }: Props) => {
  return <DayPicker mode="single" selected={selected} onSelect={onSelect} />;
};
