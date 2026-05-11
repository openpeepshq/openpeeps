import { Button, type ButtonProps } from './Button';

export interface TextButtonProps extends ButtonProps {
  text: string;
}

export function TextButton({ text, ...props }: TextButtonProps) {
  return <Button {...props}>{text}</Button>;
}
