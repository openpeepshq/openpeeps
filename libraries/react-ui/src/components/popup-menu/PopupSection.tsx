export interface PopupSectionProps {
  title: string;
}

export function PopupSection({ title }: PopupSectionProps) {
  return <div className="w-full p-2 font-semibold">{title}</div>;
}
