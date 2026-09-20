import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isSsoAddKind } from '@openpeepshq/common/lib';
import { useNavigate, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';
import {
  emptyForm,
  SsoProviderFields,
  toGeneric,
  toOidc,
  usedProviderIds,
  useSsoConfig,
  validateProviderForm,
  type ProviderFormState,
} from './configurationSsoShared';

export function AdminConfigurationSsoNew() {
  const navigate = useNavigate();
  const { kind: kindParam = '' } = useParams<{ kind: string }>();
  const { t, core, sso, persist, saving, status, setStatus, configQuery } =
    useSsoConfig();
  const kind = isSsoAddKind(kindParam) ? kindParam : undefined;
  const [form, setForm] = useState<ProviderFormState | undefined>();

  useSetPageHeader(
    t('configuration.sso.addPageTitle', {
      name: kind
        ? t(`configuration.sso.types.${kind}.title`)
        : t('configuration.sso.addTitle'),
    }),
  );

  useEffect(() => {
    if (!kind || !core || form) return;
    setForm(emptyForm(kind, usedProviderIds(sso)));
  }, [kind, core, sso, form]);

  if (!kind) {
    return <Navigate to="/admin/configuration/sso" replace />;
  }

  if (configQuery.isLoading || !core || !form) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const saveAdd = async () => {
    const error = validateProviderForm(form, t, undefined, sso);
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }
    const ok =
      form.kind === 'generic'
        ? await persist({ generic: [...sso.generic, toGeneric(form)] })
        : await persist({ oidc: [...sso.oidc, toOidc(form)] });
    if (ok) {
      navigate('/admin/configuration/sso');
    }
  };

  return (
    <div className="space-y-6 p-4">
      <button
        type="button"
        className="text-muted-foreground text-sm underline"
        data-testid="admin-sso-back"
        onClick={() => navigate('/admin/configuration/sso')}
      >
        {t('configuration.sso.backToList')}
      </button>
      <SsoProviderFields
        form={form}
        onChange={setForm}
        lockId={false}
        host={core.server.host}
      />
      <div className="flex justify-end">
        <Button
          title={t('configuration.sso.saveProvider')}
          action={() => void saveAdd()}
          disabled={saving}
          loading={saving}
          data-testid="admin-sso-save"
        >
          {t('configuration.sso.saveProvider')}
        </Button>
      </div>
      {status ? (
        <Toast
          variant={status.type}
          testId="admin-sso-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
