import { useMemo, useState } from 'react';
import {
  applyGenericProvider,
  applyOidcProvider,
  oidcTemplateNeeds,
  ssoKindDefaultId,
  ssoKindDefaultName,
  ssoOidcKind,
  uniqueSsoProviderId,
  type SsoProviderKind,
} from '@openpeepshq/common/lib';
import { type CoreConfig } from '@openpeepshq/common/types';
import { useOpenpeeps, useT } from '../../index';
import { Input, Label } from '@openpeepshq/react-ui';

export type OidcProvider = CoreConfig['sso']['oidc'][number];
export type GenericProvider = CoreConfig['sso']['generic'][number];
export type SsoConfig = CoreConfig['sso'];

export type ProviderFormState = {
  kind: SsoProviderKind;
  id: string;
  name: string;
  instanceUrl: string;
  tenant: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  approvalRequired: boolean;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  jwksUri: string;
  loginLink: string;
  profileUrl: string;
  authHeader: string;
  emailPath: string;
  handlePath: string;
  displayNamePath: string;
  avatarPath: string;
  createAccounts: boolean;
  createProfiles: boolean;
};

const PROVIDER_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export const emptyForm = (
  kind: SsoProviderKind,
  usedIds: Iterable<string> = [],
): ProviderFormState => ({
  kind,
  id: uniqueSsoProviderId(ssoKindDefaultId(kind), usedIds),
  name: ssoKindDefaultName(kind),
  instanceUrl: '',
  tenant: '',
  clientId: '',
  clientSecret: '',
  scope:
    kind === 'generic'
      ? ''
      : kind === 'oidc'
        ? 'openid email profile'
        : (oidcEndpointsScope(kind) ?? 'openid email profile'),
  approvalRequired: false,
  authorizationUrl: '',
  tokenUrl: '',
  userinfoUrl: '',
  jwksUri: '',
  loginLink: '',
  profileUrl: '',
  authHeader: 'Bearer ${token}',
  emailPath: '$.email',
  handlePath: '',
  displayNamePath: '',
  avatarPath: '',
  createAccounts: true,
  createProfiles: true,
});

const oidcEndpointsScope = (kind: SsoProviderKind) => {
  switch (kind) {
    case 'github':
      return 'read:user user:email';
    case 'discord':
      return 'identify email';
    default:
      return 'openid email profile';
  }
};

export const fromOidc = (provider: OidcProvider): ProviderFormState => ({
  ...emptyForm(ssoOidcKind(provider)),
  id: provider.id,
  name: provider.name,
  instanceUrl: provider.instanceUrl ?? '',
  tenant: provider.tenant ?? '',
  clientId: provider.clientId,
  clientSecret: provider.clientSecret ?? '',
  scope: provider.scope ?? '',
  approvalRequired: !!provider.approvalRequired,
  authorizationUrl: provider.authorizationUrl,
  tokenUrl: provider.tokenUrl,
  userinfoUrl: provider.userinfoUrl,
  jwksUri: provider.jwksUri ?? '',
});

export const fromGeneric = (provider: GenericProvider): ProviderFormState => ({
  ...emptyForm('generic'),
  id: provider.id,
  name: provider.name,
  loginLink: provider.loginLink ?? '',
  profileUrl: provider.userProfileRequest.url,
  authHeader: provider.userProfileRequest.authHeader ?? '',
  emailPath: provider.userProfilePaths.email,
  handlePath: provider.userProfilePaths.handle ?? '',
  displayNamePath: provider.userProfilePaths.displayName ?? '',
  avatarPath: provider.userProfilePaths.avatar ?? '',
  createAccounts: provider.createAccounts !== false,
  createProfiles: provider.createProfiles !== false,
});

export const oidcCallbackUrl = (host: string | undefined, id: string) => {
  if (!host || !id) return '';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/api/openpeeps/core/v1/sso/oidc/${encodeURIComponent(id)}/callback`;
};

export const usedProviderIds = (sso: SsoConfig, except?: string) =>
  new Set(
    [...sso.oidc, ...sso.generic]
      .map((provider) => provider.id)
      .filter((id) => id !== except),
  );

export const validateProviderForm = (
  form: ProviderFormState,
  t: (key: string) => string,
  exceptId?: string,
  sso?: SsoConfig,
) => {
  if (!PROVIDER_ID.test(form.id.trim())) {
    return t('configuration.sso.idRequired');
  }
  if (!form.name.trim()) {
    return t('common.form.error.required');
  }
  if (sso && usedProviderIds(sso, exceptId).has(form.id.trim())) {
    return t('configuration.sso.duplicateId');
  }
  if (form.kind !== 'generic' && !form.clientId.trim()) {
    return t('common.form.error.required');
  }
  const needs = oidcTemplateNeeds(form.kind);
  if (needs.instanceUrl === 'required' && !form.instanceUrl.trim()) {
    return t('common.form.error.required');
  }
  if (needs.tenant === 'required' && !form.tenant.trim()) {
    return t('common.form.error.required');
  }
  if (form.kind === 'oidc') {
    if (
      !form.authorizationUrl.trim() ||
      !form.tokenUrl.trim() ||
      !form.userinfoUrl.trim()
    ) {
      return t('common.form.error.required');
    }
  }
  if (form.kind === 'generic' && !form.profileUrl.trim()) {
    return t('common.form.error.required');
  }
  return undefined;
};

export const toOidc = (form: ProviderFormState) =>
  applyOidcProvider(form.kind === 'generic' ? 'oidc' : form.kind, {
    id: form.id,
    name: form.name,
    instanceUrl: form.instanceUrl,
    tenant: form.tenant,
    clientId: form.clientId,
    clientSecret: form.clientSecret || undefined,
    scope: form.scope,
    approvalRequired: form.approvalRequired,
    authorizationUrl: form.authorizationUrl,
    tokenUrl: form.tokenUrl,
    userinfoUrl: form.userinfoUrl,
    jwksUri: form.jwksUri,
  });

export const toGeneric = (form: ProviderFormState) =>
  applyGenericProvider({
    id: form.id,
    name: form.name,
    loginLink: form.loginLink,
    profileUrl: form.profileUrl,
    authHeader: form.authHeader,
    emailPath: form.emailPath,
    handlePath: form.handlePath,
    displayNamePath: form.displayNamePath,
    avatarPath: form.avatarPath,
    createAccounts: form.createAccounts,
    createProfiles: form.createProfiles,
  });

const TextField = ({
  label,
  hint,
  value,
  onChange,
  testId,
  type = 'text',
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  testId?: string;
  type?: string;
  disabled?: boolean;
}) => (
  <Label title={label} description={hint}>
    <Input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      data-testid={testId}
    />
  </Label>
);

const CheckField = ({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  testId?: string;
}) => (
  <Label title={label} forCheckbox>
    <input
      type="checkbox"
      className="h-5 w-9"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      data-testid={testId}
    />
  </Label>
);

export const SsoProviderFields = ({
  form,
  onChange,
  lockId,
  host,
}: {
  form: ProviderFormState;
  onChange: (next: ProviderFormState) => void;
  lockId: boolean;
  host?: string;
}) => {
  const t = useT();
  const set = (patch: Partial<ProviderFormState>) =>
    onChange({ ...form, ...patch });
  const callback = oidcCallbackUrl(host, form.id);
  return (
    <div className="flex flex-col gap-4">
      <TextField
        label={t('configuration.sso.fields.id')}
        hint={t('configuration.sso.fields.idHint')}
        value={form.id}
        disabled={lockId}
        onChange={(id) => set({ id })}
        testId="admin-sso-id"
      />
      <TextField
        label={t('configuration.sso.fields.name')}
        hint={t('configuration.sso.fields.nameHint')}
        value={form.name}
        onChange={(name) => set({ name })}
        testId="admin-sso-name"
      />
      {form.kind === 'generic' ? (
        <>
          <TextField
            label={t('configuration.sso.fields.loginLink')}
            value={form.loginLink}
            onChange={(loginLink) => set({ loginLink })}
            testId="admin-sso-login-link"
          />
          <TextField
            label={t('configuration.sso.fields.profileUrl')}
            value={form.profileUrl}
            onChange={(profileUrl) => set({ profileUrl })}
            testId="admin-sso-profile-url"
          />
          <TextField
            label={t('configuration.sso.fields.authHeader')}
            value={form.authHeader}
            onChange={(authHeader) => set({ authHeader })}
            testId="admin-sso-auth-header"
          />
          <TextField
            label={t('configuration.sso.generic.userProfilePaths.email')}
            value={form.emailPath}
            onChange={(emailPath) => set({ emailPath })}
          />
          <TextField
            label={t('configuration.sso.generic.userProfilePaths.handle')}
            value={form.handlePath}
            onChange={(handlePath) => set({ handlePath })}
          />
          <TextField
            label={t('configuration.sso.generic.userProfilePaths.displayName')}
            value={form.displayNamePath}
            onChange={(displayNamePath) => set({ displayNamePath })}
          />
          <TextField
            label={t('configuration.sso.generic.userProfilePaths.avatar')}
            value={form.avatarPath}
            onChange={(avatarPath) => set({ avatarPath })}
          />
          <CheckField
            label={t('configuration.sso.fields.createAccounts')}
            checked={form.createAccounts}
            onChange={(createAccounts) => set({ createAccounts })}
          />
          <CheckField
            label={t('configuration.sso.fields.createProfiles')}
            checked={form.createProfiles}
            onChange={(createProfiles) => set({ createProfiles })}
          />
        </>
      ) : (
        <>
          {oidcTemplateNeeds(form.kind).instanceUrl && (
            <TextField
              label={t('configuration.sso.fields.instanceUrl')}
              hint={t(`configuration.sso.fields.instanceUrlHint.${form.kind}`, {
                defaultValue: t(
                  'configuration.sso.fields.instanceUrlHint.default',
                ),
              })}
              value={form.instanceUrl}
              onChange={(instanceUrl) => set({ instanceUrl })}
              testId="admin-sso-instance-url"
            />
          )}
          {oidcTemplateNeeds(form.kind).tenant && (
            <TextField
              label={t(`configuration.sso.fields.tenantLabel.${form.kind}`, {
                defaultValue: t('configuration.sso.fields.tenant'),
              })}
              hint={t(`configuration.sso.fields.tenantHint.${form.kind}`, {
                defaultValue: t('configuration.sso.fields.tenantHint.default'),
              })}
              value={form.tenant}
              onChange={(tenant) => set({ tenant })}
              testId="admin-sso-tenant"
            />
          )}
          {form.kind === 'oidc' && (
            <>
              <TextField
                label={t('configuration.sso.fields.authorizationUrl')}
                value={form.authorizationUrl}
                onChange={(authorizationUrl) => set({ authorizationUrl })}
                testId="admin-sso-authorization-url"
              />
              <TextField
                label={t('configuration.sso.fields.tokenUrl')}
                value={form.tokenUrl}
                onChange={(tokenUrl) => set({ tokenUrl })}
                testId="admin-sso-token-url"
              />
              <TextField
                label={t('configuration.sso.fields.userinfoUrl')}
                value={form.userinfoUrl}
                onChange={(userinfoUrl) => set({ userinfoUrl })}
                testId="admin-sso-userinfo-url"
              />
              <TextField
                label={t('configuration.sso.fields.jwksUri')}
                value={form.jwksUri}
                onChange={(jwksUri) => set({ jwksUri })}
                testId="admin-sso-jwks-uri"
              />
            </>
          )}
          <TextField
            label={t('configuration.sso.fields.clientId')}
            value={form.clientId}
            onChange={(clientId) => set({ clientId })}
            testId="admin-sso-client-id"
          />
          <TextField
            label={t('configuration.sso.fields.clientSecret')}
            hint={t('configuration.sso.fields.clientSecretHint')}
            type="password"
            value={form.clientSecret}
            onChange={(clientSecret) => set({ clientSecret })}
            testId="admin-sso-client-secret"
          />
          <TextField
            label={t('configuration.sso.fields.scope')}
            value={form.scope}
            onChange={(scope) => set({ scope })}
            testId="admin-sso-scope"
          />
          <CheckField
            label={t('configuration.sso.fields.approvalRequired')}
            checked={form.approvalRequired}
            onChange={(approvalRequired) => set({ approvalRequired })}
          />
          {callback ? (
            <p
              className="text-muted-foreground text-xs"
              data-testid="admin-sso-callback"
            >
              {t('configuration.sso.callbackUrl')}: {callback}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};

export const useSsoConfig = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead('openpeeps', 'core');
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'core',
  });
  const core = configQuery.data?.config as CoreConfig | undefined;
  const sso = useMemo<SsoConfig>(
    () =>
      core?.sso ?? {
        generic: [],
        oidc: [],
      },
    [core],
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const persist = async (next: Partial<SsoConfig>) => {
    setSaving(true);
    setStatus(null);
    try {
      await updateConfig({ config: { sso: next } });
      setStatus({
        type: 'success',
        message: t('configuration.sso.updateSuccess'),
      });
      return true;
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { t, core, sso, persist, saving, status, setStatus, configQuery };
};
