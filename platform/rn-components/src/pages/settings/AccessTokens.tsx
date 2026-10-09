import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import type { ScopeLevel } from '@openpeepshq/common/types';
import {
  ACCESS_TOKEN_EXPIRATION_OPTIONS,
  ACCESS_TOKEN_RESOURCE_TYPES,
  ACCESS_TOKEN_SCOPE_LEVELS,
  accessTokenScopeLabel,
  useAccessTokens,
  type AccessTokenResourceType,
} from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import { ChevronDownIcon, CopyIcon } from '../../components/icons/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { ThemedText } from '../../components/ui/themed-text';

type AccessTokensSettingsProps = MainScreenProps<'AccessTokensSettings'>;

/** Native stand-in for the web `<select>`: an outline trigger plus menu. */
const Chooser = <T extends string>({
  value,
  label,
  options,
  onSelect,
  className,
}: {
  value: T;
  label: (value: T) => string;
  options: readonly T[];
  onSelect: (value: T) => void;
  className?: string;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className={`flex-row items-center justify-between gap-x-2 ${className ?? ''}`}
      >
        <ThemedText>{label(value)}</ThemedText>
        <ChevronDownIcon size={16} className="text-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {options.map((option) => (
        <DropdownMenuItem key={option} onPress={() => onSelect(option)}>
          <ThemedText>{label(option)}</ThemedText>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export const AccessTokensSettings: React.FC<AccessTokensSettingsProps> = () => {
  const { t } = useTranslation();
  const {
    tokens,
    form,
    setForm,
    creating,
    createdToken,
    error,
    clearError,
    updateScope,
    addScope,
    removeScope,
    create,
    revoke,
  } = useAccessTokens();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  const expirationValues = ACCESS_TOKEN_EXPIRATION_OPTIONS.map((o) => o.value);
  const expirationLabel = (value: string) =>
    t(
      ACCESS_TOKEN_EXPIRATION_OPTIONS.find((o) => o.value === value)
        ?.labelKey ?? value
    );

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader title={t('settings.accessTokens.title')} />
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="gap-3 rounded-md border border-border p-4">
          <ThemedText className="text-lg font-medium">
            {t('settings.accessTokens.createTitle')}
          </ThemedText>
          <ThemedText className="text-sm text-muted-foreground">
            {t('settings.accessTokens.createDescription')}
          </ThemedText>
          <View className="gap-2">
            <Label nativeID="token-name">
              {t('settings.accessTokens.name')}
            </Label>
            <Input
              value={form.name}
              placeholder={t('settings.accessTokens.namePlaceholder')}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            />
          </View>
          <View className="gap-2">
            <Label nativeID="token-description">
              {t('settings.accessTokens.descriptionLabel')}
            </Label>
            <Input
              value={form.description ?? ''}
              placeholder={t('settings.accessTokens.descriptionPlaceholder')}
              onChangeText={(description) =>
                setForm((f) => ({ ...f, description }))
              }
            />
          </View>
          <View className="gap-2">
            <Label nativeID="token-expiration">
              {t('settings.accessTokens.expiration')}
            </Label>
            <Chooser
              value={form.expirationTime ?? '30d'}
              label={expirationLabel}
              options={expirationValues}
              onSelect={(expirationTime) =>
                setForm((f) => ({ ...f, expirationTime }))
              }
            />
          </View>

          <ThemedText className="text-sm font-medium">
            {t('settings.accessTokens.scopes')}
          </ThemedText>

          {(form.scopes ?? []).map((scope, index) => (
            <View key={index} className="flex-row flex-wrap items-end gap-2">
              <Chooser<ScopeLevel>
                value={scope.scopeLevel ?? 'read'}
                label={(v) => v}
                options={ACCESS_TOKEN_SCOPE_LEVELS}
                onSelect={(scopeLevel) => updateScope(index, { scopeLevel })}
              />
              <Chooser<AccessTokenResourceType>
                value={scope.resource.type as AccessTokenResourceType}
                label={(v) => v}
                options={ACCESS_TOKEN_RESOURCE_TYPES}
                onSelect={(resourceType) =>
                  updateScope(index, { resourceType })
                }
              />
              <Button
                variant="outline"
                disabled={(form.scopes?.length ?? 0) === 1}
                onPress={() => removeScope(index)}
              >
                <ThemedText>{t('common.remove')}</ThemedText>
              </Button>
            </View>
          ))}

          <Button variant="outline" onPress={addScope}>
            <ThemedText>{t('settings.accessTokens.addScope')}</ThemedText>
          </Button>

          <Button disabled={creating} onPress={() => void create()}>
            <ThemedText className="text-primary-foreground">
              {creating
                ? t('settings.accessTokens.creating')
                : t('settings.accessTokens.create')}
            </ThemedText>
          </Button>

          {createdToken ? (
            <View className="rounded-md border border-border p-3">
              <ThemedText className="text-sm font-semibold">
                {t('settings.accessTokens.copyWarning')}
              </ThemedText>
              <View className="mt-2 flex-row items-start gap-2">
                <ThemedText className="flex-1 text-sm" selectable>
                  {createdToken}
                </ThemedText>
                <Button
                  size="icon"
                  variant="ghost"
                  accessibilityLabel={t('settings.accessTokens.copy')}
                  onPress={() => Clipboard.setString(createdToken)}
                >
                  <CopyIcon size={16} className="text-foreground" />
                </Button>
              </View>
            </View>
          ) : null}
        </View>

        <View className="gap-3 rounded-md border border-border p-4">
          <ThemedText className="text-lg font-medium">
            {t('settings.accessTokens.listTitle')}
          </ThemedText>
          {tokens.length === 0 ? (
            <ThemedText className="text-sm text-muted-foreground">
              {t('settings.accessTokens.empty')}
            </ThemedText>
          ) : (
            tokens.map((token) => (
              <View
                key={token.id}
                className="rounded-md border border-border p-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <ThemedText className="font-semibold">
                      {token.name}
                    </ThemedText>
                    {token.description ? (
                      <ThemedText className="text-sm text-muted-foreground">
                        {token.description}
                      </ThemedText>
                    ) : null}
                    <ThemedText className="mt-1 text-xs text-muted-foreground">
                      {t('settings.accessTokens.expiresAt')}:{' '}
                      {token.expiresAt
                        ? new Date(token.expiresAt).toLocaleString()
                        : t('settings.accessTokens.never')}
                    </ThemedText>
                  </View>
                  <Button
                    variant="outline"
                    disabled={!!token.revokedAt}
                    onPress={() => void revoke(token.id)}
                  >
                    <ThemedText>
                      {token.revokedAt
                        ? t('settings.accessTokens.revoked')
                        : t('settings.accessTokens.revoke')}
                    </ThemedText>
                  </Button>
                </View>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {(token.scopes ?? []).length ? (
                    (token.scopes ?? []).map((scope, scopeIndex) => (
                      <View
                        key={scopeIndex}
                        className="rounded-full border border-border px-2 py-0.5"
                      >
                        <ThemedText className="text-xs">
                          {accessTokenScopeLabel(scope)}
                        </ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText className="text-xs text-muted-foreground">
                      {t('settings.accessTokens.noScopes')}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedSafeAreaView>
  );
};
