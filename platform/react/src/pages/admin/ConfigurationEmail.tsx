import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
} from '../../index';
import {
  Button,
  ExpandableBox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Toast,
} from '@openpeepshq/react-ui';

type EmailConfig = CoreConfig['email'];
const emailFormSchema = coreConfigSanitizedSchema.shape.email;

const withSecureTransport = (email: EmailConfig): EmailConfig => ({
  ...email,
  transportConfig: { ...email.transportConfig, secure: true },
});

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

  const form = useForm({
    resolver: zodResolver(emailFormSchema),
    values: draft ?? undefined,
    mode: 'onChange',
  });

  const [testRecipient, setTestRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const current = form.watch();
  const unchanged =
    !!baseEmail &&
    equal(baseEmail as unknown as ConfigTree, current as unknown as ConfigTree);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!baseEmail) return;
    const next = withSecureTransport(values);
    const data = diffConfigTrees(
      baseEmail as unknown as ConfigTree,
      next as unknown as ConfigTree,
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
  });

  const handleSendTest = async () => {
    const trimmed = testRecipient.trim();
    if (!trimmed) {
      setStatus({
        type: 'error',
        message: t('configuration.email.recipientRequired'),
      });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await sendTest({
        to: trimmed,
        email: withSecureTransport(form.getValues() as EmailConfig),
      });
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

  return (
    <div className="space-y-6 p-4">
      <p className="text-sm opacity-80">{t('configuration.email.intro')}</p>

      <Form {...form}>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
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
            <FormField
              control={form.control}
              name="transportConfig.host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('configuration.email.fields.host')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      data-testid="admin-email-host"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transportConfig.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('configuration.email.fields.port')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? Number.NaN
                            : Number(e.target.value),
                        )
                      }
                      data-testid="admin-email-port"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transportConfig.auth.user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('configuration.email.fields.authUser')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="text" value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transportConfig.auth.pass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('configuration.email.fields.authPass')}
                  </FormLabel>
                  <FormDescription>
                    {t('configuration.email.fields.authPassDescription')}
                  </FormDescription>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('configuration.email.fields.service')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultTemplatePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('configuration.email.fields.defaultTemplatePath')}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        'configuration.email.fields.defaultTemplatePathDescription',
                      )}
                    </FormDescription>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('configuration.email.fields.defaultFrom')}
                    </FormLabel>
                    <FormDescription>
                      {t('configuration.email.fields.defaultFromDescription')}
                    </FormDescription>
                    <FormControl>
                      <Input {...field} type="text" value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ExpandableBox>

          <span className="flex justify-end pt-2">
            <Button
              type="submit"
              title={t('common.submit', { defaultValue: 'Submit' })}
              disabled={!form.formState.isValid || unchanged}
              loading={form.formState.isSubmitting}
              variant="default"
              data-testid="admin-email-submit"
            >
              {t('common.submit', { defaultValue: 'Submit' })}
            </Button>
          </span>
        </form>
      </Form>

      <div className="bg-surface-2 rounded-lg p-4">
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
              data-testid="admin-email-test-recipient"
            />
          </label>
          <Button
            variant="secondary"
            title={t('configuration.email.sendTest')}
            action={handleSendTest}
            disabled={sending}
            data-testid="admin-email-send-test"
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
        <Toast
          variant={status.type}
          testId="admin-email-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
