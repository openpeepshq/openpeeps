<script lang="ts">
  import { Button, ExpandableBox, Form, FormInput, Loader } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import {
    coreConfigSanitizedSchema,
    type CoreConfig,
  } from '@openpeeps/common/types';
  import { configStore, updateConfigMutation } from '$lib/api';
  import { sendTestEmailMutation } from '$lib/api/admin/email';
  import { diffConfigTrees, equal } from '$lib/components/core/configuration/helpers';
  import { toast } from '$lib/utils/toast';
  import { i18nContext } from '$lib/components/i18n';
  import { useQueryClient } from '@tanstack/svelte-query';

  type EmailConfig = CoreConfig['email'];
  const emailFormSchema = coreConfigSanitizedSchema.shape.email;

  const { t } = i18nContext();
  const toastStore = getToastStore();
  const queryClient = useQueryClient();

  const coreConfigStore = configStore('openpeeps', 'core');
  const updateConfig = updateConfigMutation({
    namespace: 'openpeeps',
    name: 'core',
  });
  const sendTest = sendTestEmailMutation();

  let emailDraft = $state<EmailConfig | null>(null);
  let testRecipient = $state('');
  let sending = $state(false);
  let formValid = $state(false);

  $effect(() => {
    const d = $coreConfigStore.data;
    if (!d) {
      return;
    }
    emailDraft = structuredClone(d.config.email);
  });

  const handleSubmit = async () => {
    if (!emailDraft || !$coreConfigStore.data) {
      return;
    }
    emailDraft.transportConfig.secure = true;
    const data = diffConfigTrees($coreConfigStore.data.config.email, emailDraft);
    if (Object.keys(data).length === 0) {
      return;
    }
    await updateConfig({
      config: { email: data } as Partial<CoreConfig>,
    });
    queryClient.invalidateQueries({ queryKey: ['server'], exact: true });
    toastStore.trigger(
      toast({
        message: t('configuration.email.updateSuccess'),
        background: 'variant-filled-success',
      }),
    );
  };

  const handleSendTest = async () => {
    const trimmed = testRecipient.trim();
    if (!trimmed) {
      toastStore.trigger(
        toast({
          message: t('configuration.email.recipientRequired'),
          background: 'variant-filled-warning',
          autohide: true,
        }),
      );
      return;
    }
    if (!emailDraft) {
      return;
    }
    emailDraft.transportConfig.secure = true;
    sending = true;
    try {
      await sendTest({
        to: trimmed,
        email: emailDraft,
      });
      toastStore.trigger(
        toast({
          message: t('configuration.email.testSuccess'),
          background: 'variant-filled-success',
          autohide: true,
        }),
      );
    } catch (e: unknown) {
      const detail =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : '';
      toastStore.trigger(
        toast({
          message: detail
            ? `${t('configuration.email.testFailed')}: ${detail}`
            : t('configuration.email.testFailed'),
          background: 'variant-filled-error',
          autohide: false,
        }),
      );
    } finally {
      sending = false;
    }
  };

  const portFromInput = (
    e: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  ) => {
    if (e instanceof HTMLInputElement && e.type === 'number') {
      return e.value === '' ? NaN : Number(e.value);
    }
    return e.value;
  };
</script>

<Loader queries={[$coreConfigStore]}>
  {#if $coreConfigStore.data && emailDraft}
    <div class="space-y-6">
      <p class="text-sm opacity-80">
        {t('configuration.email.intro')}
      </p>

      <Form
        bind:data={emailDraft}
        bind:valid={formValid}
        schema={emailFormSchema}
        onsubmit={handleSubmit}
      >
        <div class="flex flex-col gap-6">
          <section class="flex flex-col gap-4" aria-labelledby="email-config-transport-heading">
            <h3 id="email-config-transport-heading" class="text-base font-semibold">
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
              elementToValue={
                portFromInput as (
                  e: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
                ) => string | boolean
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

          <ExpandableBox initialOpen={false}>
            {#snippet title()}
              <p class="text-base font-semibold">
                {t('configuration.email.sections.general')}
              </p>
            {/snippet}
            <div class="flex flex-col gap-4 pt-1">
              <FormInput
                path={['renderHostBaseUrl']}
                type="text"
                title={t('configuration.email.fields.renderHostBaseUrl')}
                description={t('configuration.email.fields.renderHostBaseUrlDescription')}
                placeholder="https://example.com"
              />
              <FormInput
                path={['service']}
                type="text"
                title={t('configuration.email.fields.service')}
              />
              <FormInput
                path={['defaultTemplatePath']}
                type="text"
                title={t('configuration.email.fields.defaultTemplatePath')}
                description={t('configuration.email.fields.defaultTemplatePathDescription')}
              />
              <FormInput
                path={['defaultFrom']}
                type="text"
                title={t('configuration.email.fields.defaultFrom')}
                description={t('configuration.email.fields.defaultFromDescription')}
              />
            </div>
          </ExpandableBox>
        </div>

        <span class="flex justify-end pt-2">
          <Button
            title={t('common.submit')}
            disabled={!formValid ||
              equal($coreConfigStore.data.config.email, emailDraft)}
            action={handleSubmit}
            variant="variant-filled-primary"
          >
            {t('common.submit')}
          </Button>
        </span>
      </Form>

      <div class="rounded-lg bg-surface-200-700-token p-4">
        <p class="font-medium">{t('configuration.email.testTitle')}</p>
        <p class="mb-3 text-sm opacity-80">
          {t('configuration.email.testHint')}
        </p>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label class="label flex-1">
            <span>{t('configuration.email.testRecipient')}</span>
            <input
              type="email"
              bind:value={testRecipient}
              class="input rounded"
              placeholder={t('configuration.email.testRecipientPlaceholder')}
              autocomplete="email"
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
        <p class="mt-3 text-xs opacity-70">
          {t('configuration.email.bounceNote')}
        </p>
      </div>
    </div>
  {/if}
</Loader>
