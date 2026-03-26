<script lang="ts">
  import { z, ZodObject, type ZodRawShape } from 'zod';
  import { getToastStore, TreeView } from '@skeletonlabs/skeleton';
  import { ConfigurationCategory } from '..';
  import { updateConfigMutation, testPaymentMutation } from '$lib/api';
  import { Button } from '@openpeeps/ui';
  import {
    diffConfigTrees,
    equal,
  } from '$lib/components/core/configuration/helpers';
  import { toast } from '$lib/utils/toast';
  import { hasValue } from '@openpeeps/common';
  import { i18nContext } from '$lib/components/i18n';

  interface Props {
    schema: ZodObject<ZodRawShape>;
    config: z.infer<typeof schema>;
    defaults: z.infer<typeof schema>;
    namespace: string;
    name: string;
    onUpdate?: () => void;
  }

  let {
    schema,
    config,
    defaults,
    namespace,
    name,
    onUpdate = () => {},
  }: Props = $props();

  const updateConfig = updateConfigMutation({ namespace, name });
  const testPayment = testPaymentMutation();

  const toastStore = getToastStore();

  let value: z.infer<typeof schema> | undefined = $state();

  const { t } = i18nContext();

  const handleSubmit = async () => {
    const data = diffConfigTrees(config, value!);
    const paidMembership = data?.payments?.stripe?.paidMembership?.enabled;
    const enabled =
      paidMembership === undefined &&
      config?.payments?.stripe?.paidMembership?.enabled;
    if (hasValue(data?.payments?.stripe) && enabled) {
      const { success, key } = await testPayment({
        ...data.payments.stripe,
        paidMembership: {
          ...config.payments.stripe.paidMembership,
          ...data.payments.stripe.paidMembership,
          enabled,
        },
      });
      if (!success) {
        toastStore.trigger(
          toast({
            message: t(key!),
            background: 'variant-filled-error',
            autohide: true,
          }),
        );
        return;
      }
    }
    await updateConfig({
      config: data,
    });
    onUpdate();
  };
</script>

<div class="mb-20 h-full">
  <TreeView indent="ml-4" open>
    <ConfigurationCategory bind:value {schema} {config} {defaults} />
  </TreeView>

  <span class="mt-4 flex justify-end">
    <Button
      title="Submit"
      disabled={equal(config, value!)}
      action={handleSubmit}
      variant="variant-filled-primary"
    >
      Submit
    </Button>
  </span>
</div>
