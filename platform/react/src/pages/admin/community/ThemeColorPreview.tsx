import type { CSSProperties } from 'react';
import { Bell, Home, Newspaper } from 'lucide-react';
import {
  Button,
  contrastRatio,
  generateA11yOnColor,
  hexToTailwindRgbString,
  themeBackgroundHex,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';

type Mode = 'light' | 'dark';

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

// 3:1 is the WCAG floor for icons and controls against the page background.
const MIN_CONTRAST = 3;

const themeName = {
  light: 'OpenpeepsLight',
  dark: 'OpenpeepsDark',
} as const;

export type ThemeColorPreviewProps = {
  mode: Mode;
  primaryHex: string;
  buttonRadius?: string;
};

export const ThemeColorPreview = ({
  mode,
  primaryHex,
  buttonRadius,
}: ThemeColorPreviewProps) => {
  const t = useT();
  const ratio = contrastRatio(primaryHex, themeBackgroundHex[mode]);
  const channels = hexToTailwindRgbString(primaryHex);
  const valid = channels !== '(invalid)';
  const style: ThemeStyle | undefined = valid
    ? {
        '--color-primary': channels,
        '--color-primary-foreground': generateA11yOnColor(
          primaryHex.startsWith('#') ? primaryHex : `#${primaryHex}`,
        ),
        '--theme-rounded-base': buttonRadius?.trim() || '9999px',
      }
    : undefined;

  const linkKeys = [
    'configuration.community.preview.linkGuidelines',
    'configuration.community.preview.linkEvents',
    'configuration.community.preview.linkMembers',
  ] as const;

  return (
    <div className="flex flex-col gap-2">
      {ratio !== null && ratio < MIN_CONTRAST ? (
        <p className="text-destructive text-sm" role="status">
          {t('configuration.community.contrastPoor', {
            mode: t(`configuration.community.${mode}Theme.mode`),
            ratio: ratio.toFixed(1),
          })}
        </p>
      ) : null}
      <div
        inert
        aria-hidden="true"
        data-theme={themeName[mode]}
        style={style}
        className="bg-background text-foreground overflow-hidden rounded-lg border"
      >
        <div className="grid">
          <div className="border-b p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {t('configuration.community.preview.navigation')}
            </p>
            <div className="text-foreground/70 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
              <Home className="size-4" />
              {t('configuration.community.preview.home')}
            </div>
            <div className="text-primary flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-bold">
              <Newspaper className="size-4" />
              {t('configuration.community.preview.feed')}
            </div>
            <div className="text-foreground/70 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
              <Bell className="size-4" />
              {t('configuration.community.preview.notifications')}
            </div>
            <Button
              className="mt-3"
              size="sm"
              variant="default"
              title={t('configuration.community.preview.join')}
            >
              {t('configuration.community.preview.join')}
            </Button>
          </div>
          <div className="p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {t('configuration.community.preview.article')}
            </p>
            <p className="text-sm font-semibold">
              {t('configuration.community.preview.articleTitle')}
            </p>
            <p className="mt-1 text-sm">
              {t('configuration.community.preview.articleLead')}
              <span className="text-primary underline">
                {t('configuration.community.preview.articleLink')}
              </span>
              {t('configuration.community.preview.articleTrail')}
            </p>
            <p className="text-muted-foreground mb-1 mt-3 text-xs font-medium">
              {t('configuration.community.preview.links')}
            </p>
            <ul className="space-y-1">
              {linkKeys.map((key) => (
                <li key={key}>
                  <span className="text-primary text-sm underline">
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
