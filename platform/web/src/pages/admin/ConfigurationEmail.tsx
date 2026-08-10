import { useMemo, useState } from 'react';
import {
  coreConfigSanitizedSchema,
  type CoreConfig,
  type ConfigTree,
} from '@openpeepshq/common/types';
import {
  useT,
  useSetPageHeader,
  useOpenpeeps,
  diffConfigTrees,
  equal,
} from '@openpeepshq/react';
import {
  Button,
  ExpandableBox,
  Form,
  FormInput,
  Toast,
} from '@openpeepshq/react-ui';

type EmailConfig = CoreConfig['email'];
const emailFormSchema = coreConfigSanitizedSchema.shape.email;

export function AdminConfigurationEmail() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead('openpeeps', 'core');
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'core',
  });
  const sendTest = openpeepsApi.admin.sendTestEmailAction();

  useSetPageHeader(t('configuration.email.title', { defaultValue: 'Email' }));

  const baseEmail = configQuery.data?.config?.email as EmailConfig | undefined;
  const draft = useMemo(
    () => (baseEmail ? structuredClone(baseEmail) : null),
    [baseEmail],
  );

  const [testRecipient, setTestRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [valid, setValid] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!draft || !baseEmail) return;
    draft.transportConfig.secure = true;
    const data = diffConfigTrees(
      baseEmail as unknown as ConfigTree,
      draft as unknown as ConfigTree,
    );
    if (Object.keys(data).length === 0) return;
    setStatus(null);
    try {
      await updateConfig({ config: { email: data } as Partial<CoreConfig> });
      setStatus({
        type: 'success',
        message: t('configuration.email.updateSuccess'),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  const handleSendTest = async () => {
    const trimmed = testRecipient.trim();
    if (!trimmed) {
      setStatus({
        type: 'error',
        message: t('configuration.email.recipientRequired'),
      });
      return;
    }
    if (!draft) return;
    draft.transportConfig.secure = true;
    setSending(true);
    setStatus(null);
    try {
      await sendTest({ to: trimmed, email: draft });
      setStatus({
        type: 'success',
        message: t('configuration.email.testSuccess'),
      });
    } catch (err) {
      const detail = (err as Error).message;
      setStatus({
        type: 'error',
        message: detail
          ? `${t('configuration.email.testFailed')}: ${detail}`
          : t('configuration.email.testFailed'),
      });
    } finally {
      setSending(false);
    }
  };

  if (configQuery.isLoading || !draft || !baseEmail) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const unchanged = equal(
    baseEmail as unknown as ConfigTree,
    draft as unknown as ConfigTree,
  );

  return (
    <div className="space-y-6 p-4">
      <p className="text-sm opacity-80">{t('configuration.email.intro')}</p>

      <Form
        data={draft}
        schema={emailFormSchema as never}
        onSubmit={handleSubmit}
        onValidChange={setValid}
      >
        <div className="flex flex-col gap-6">
          <section
            className="flex flex-col gap-4"
            aria-labelledby="email-config-transport-heading"
          >
            <h3
              id="email-config-transport-heading"
              className="text-base font-semibold"
            >
              {t('configuration.email.sections.transport')}
            </h3>
            <FormInput
              path={['transportConfig', 'host']}
              type="text"
              title={t('configuration.email.fields.host')}
            />
            <FormInput
              path={['transportConfig', 'port']}
              type="number"
              title={t('configuration.email.fields.port')}
              elementToValue={(e) =>
                e.value === ''
                  ? (NaN as unknown as string)
                  : (Number(e.value) as unknown as string)
              }
            />
            <FormInput
              path={['transportConfig', 'auth', 'user']}
              type="text"
              title={t('configuration.email.fields.authUser')}
            />
            <FormInput
              path={['transportConfig', 'auth', 'pass']}
              type="password"
              title={t('configuration.email.fields.authPass')}
              description={t('configuration.email.fields.authPassDescription')}
            />
          </section>

          <ExpandableBox
            initialOpen={false}
            title={
              <p className="text-base font-semibold">
                {t('configuration.email.sections.general')}
              </p>
            }
          >
            <div className="flex flex-col gap-4 pt-1">
              <FormInput
                path={['service']}
                type="text"
                title={t('configuration.email.fields.service')}
              />
              <FormInput
                path={['defaultTemplatePath']}
                type="text"
                title={t('configuration.email.fields.defaultTemplatePath')}
                description={t(
                  'configuration.email.fields.defaultTemplatePathDescription',
                )}
              />
              <FormInput
                path={['defaultFrom']}
                type="text"
                title={t('configuration.email.fields.defaultFrom')}
                description={t(
                  'configuration.email.fields.defaultFromDescription',
                )}
              />
            </div>
          </ExpandableBox>
        </div>

        <span className="flex justify-end pt-2">
          <Button
            title={t('common.submit', { defaultValue: 'Submit' })}
            disabled={!valid || unchanged}
            action={handleSubmit}
            variant="variant-filled-primary"
          >
            {t('common.submit', { defaultValue: 'Submit' })}
          </Button>
        </span>
      </Form>

      <div className="bg-surface-200 rounded-lg p-4">
        <p className="font-medium">{t('configuration.email.testTitle')}</p>
        <p className="mb-3 text-sm opacity-80">
          {t('configuration.email.testHint')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span>{t('configuration.email.testRecipient')}</span>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="op-input rounded"
              placeholder={t('configuration.email.testRecipientPlaceholder')}
              autoComplete="email"
            />
          </label>
          <Button
            variant="variant-filled-secondary"
            title={t('configuration.email.sendTest')}
            action={handleSendTest}
            disabled={sending}
          >
            {sending
              ? t('common.form.loading')
              : t('configuration.email.sendTest')}
          </Button>
        </div>
        <p className="mt-3 text-xs opacity-70">
          {t('configuration.email.bounceNote')}
        </p>
      </div>

      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
