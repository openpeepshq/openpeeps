import { Button } from '@openpeepshq/react-ui';

export interface PageHeaderActionProps {
  title: string;
  action?: () => Promise<void> | void;
}

export function PageHeaderAction({ title, action }: PageHeaderActionProps) {
  return (
    <Button
      title={title}
      className="h-6 w-fit text-sm"
      variant="outline"
      action={
        action
          ? () => Promise.resolve(action()).then(() => undefined)
          : undefined
      }
    >
      <span>{title}</span>
    </Button>
  );
}
