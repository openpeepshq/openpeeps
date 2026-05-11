import { Button } from '@openpeeps/react-ui';

export function TestError() {
  const blowUp = () => {
    throw new Error('test error from the test/error page');
  };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Error sandbox</h1>
      <p className="text-sm text-muted-foreground">
        Click the button to throw a synchronous error so the error boundary can
        catch it.
      </p>
      <Button
        title="Throw"
        variant="variant-filled-error"
        action={blowUp}
      >
        Throw error
      </Button>
    </div>
  );
}
