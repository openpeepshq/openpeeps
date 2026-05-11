import * as React from 'react';
import { Button } from '@/components/button';
import { useFormContext, useFormMessages } from './context';

export interface SubmitButtonProps {
  title: string;
  action: () => unknown | Promise<unknown>;
  children?: React.ReactNode;
  disable?: boolean;
}

export function SubmitButton({ title, action, children, disable = true }: SubmitButtonProps) {
  const { validate } = useFormContext();
  const messages = useFormMessages();

  React.useEffect(() => {
    void validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = Object.keys(messages).length === 0;

  return (
    <Button
      title={title}
      action={action}
      variant="variant-filled-primary"
      className="w-full"
      disabled={disable ? !valid : false}
    >
      {children}
    </Button>
  );
}
