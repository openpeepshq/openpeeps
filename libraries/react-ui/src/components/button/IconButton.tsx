import { Button, type ButtonProps } from './Button';
import type { IconType } from '@/types';

export interface IconButtonProps extends ButtonProps {
  icon: IconType;
  iconSize?: number;
}

export function IconButton({ icon: Icon, iconSize, ...props }: IconButtonProps) {
  return (
    <Button {...props}>
      <Icon size={iconSize} />
    </Button>
  );
}
