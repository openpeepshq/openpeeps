import { useSetPageHeader } from '../../index';
import { Button } from '@openpeepshq/react-ui';

export function TestError() {
  useSetPageHeader('Error sandbox');
  const blowUp = () => {
    throw new Error('test error from the test/error page');
  };
  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-sm">
        Click the button to throw a synchronous error so the error boundary can
        catch it.
      </p>
      <Button title="Throw" variant="destructive" action={blowUp}>
        Throw error
      </Button>
    </div>
  );
}
