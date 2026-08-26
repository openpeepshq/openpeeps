import type { ReactElement } from 'react';
import { Pencil } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  IconButton,
  Input,
  Label,
  Link,
  LoadingSpinner,
  RadioGroup,
  RadioGroupItem,
  Separator,
  ShadcnLabel,
  Skeleton,
  StopWatch,
  Switch,
  Textarea,
  TextButton,
  Timespan,
  UpdatingDate,
  type ButtonSize,
  type ButtonVariant,
  type BadgeVariant,
} from '@openpeepshq/react-ui';
import { ShowcaseSection } from '@/components/ShowcaseSection';
import { showcase } from '@/types';

const BUTTON_VARIANTS: ButtonVariant[] = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
];

const BUTTON_SIZES: ButtonSize[] = ['sm', 'default', 'lg'];

const BADGE_VARIANTS: BadgeVariant[] = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'success',
  'warning',
];

const ButtonShowcase = (): ReactElement => (
  <div className="space-y-4">
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr>
            <th className="text-muted-foreground px-2 py-1 text-left font-medium">
              Variant
            </th>
            {BUTTON_SIZES.map((size) => (
              <th
                key={size}
                className="text-muted-foreground px-2 py-1 text-left font-medium"
              >
                {size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BUTTON_VARIANTS.map((variant) => (
            <tr key={variant}>
              <td className="px-2 py-1 font-mono text-xs">{variant}</td>
              {BUTTON_SIZES.map((size) => (
                <td key={size} className="px-2 py-1">
                  <Button
                    variant={variant}
                    size={size}
                    action={() => undefined}
                  >
                    Button
                  </Button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        title="Icon"
        action={() => undefined}
      >
        <Pencil className="size-4" />
      </Button>
      <Button variant="default" loading action={() => undefined}>
        Loading
      </Button>
      <Button variant="secondary" disabled action={() => undefined}>
        Disabled
      </Button>
      <Button variant="unstyled" className="underline" action={() => undefined}>
        Unstyled
      </Button>
    </div>
  </div>
);

const IconButtonShowcase = (): ReactElement => (
  <div className="flex flex-wrap gap-2">
    {BUTTON_VARIANTS.filter((variant) => variant !== 'link').map((variant) => (
      <IconButton
        key={variant}
        variant={variant}
        size="icon"
        icon={Pencil}
        title={variant}
        action={() => undefined}
      />
    ))}
  </div>
);

export const atomShowcases = [
  showcase(
    'atoms',
    'button',
    'Button',
    () => (
      <ShowcaseSection
        title="Button"
        description="Figma / shadcn variants, sizes, loading, disabled, and unstyled."
      >
        <ButtonShowcase />
      </ShowcaseSection>
    ),
    'Primary action control. Every styled variant × size, plus icon / loading / disabled / unstyled.',
  ),
  showcase(
    'atoms',
    'icon-button',
    'IconButton',
    () => (
      <ShowcaseSection title="IconButton">
        <IconButtonShowcase />
      </ShowcaseSection>
    ),
    'Button that renders a Lucide icon as its only child.',
  ),
  showcase('atoms', 'text-button', 'TextButton', () => (
    <ShowcaseSection title="TextButton">
      <div className="flex flex-wrap gap-2">
        {BUTTON_VARIANTS.map((variant) => (
          <TextButton
            key={variant}
            variant={variant}
            text={variant}
            action={() => undefined}
          />
        ))}
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'input', 'Input', () => (
    <ShowcaseSection title="Input">
      <div className="grid max-w-md gap-3">
        <Input type="email" defaultValue="alex@example.org" />
        <Input type="text" placeholder="Placeholder" />
        <Input type="text" defaultValue="Disabled" disabled />
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'textarea', 'Textarea', () => (
    <ShowcaseSection title="Textarea">
      <Textarea
        className="max-w-md"
        defaultValue="A short note that looks like real community copy."
      />
    </ShowcaseSection>
  )),
  showcase('atoms', 'label', 'Label', () => (
    <ShowcaseSection
      title="Label"
      description="OpenPeeps Label (with description) and the shadcn label primitive."
    >
      <div className="grid max-w-md gap-4">
        <Label
          title="Display name"
          description="Shown on your public profile."
          required
        >
          <Input defaultValue="Alex Rivera" />
        </Label>
        <div className="space-y-1">
          <ShadcnLabel htmlFor="gallery-shadcn-label">Email</ShadcnLabel>
          <Input id="gallery-shadcn-label" defaultValue="alex@example.org" />
        </div>
      </div>
    </ShowcaseSection>
  )),
  showcase(
    'atoms',
    'badge',
    'Badge',
    () => (
      <ShowcaseSection title="Badge">
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} status={variant} variant={variant} />
          ))}
        </div>
      </ShowcaseSection>
    ),
    'All theme badge variants.',
  ),
  showcase('atoms', 'checkbox', 'Checkbox', () => (
    <ShowcaseSection title="Checkbox">
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked />
          Checked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox />
          Unchecked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox disabled />
          Disabled
        </label>
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'switch', 'Switch', () => (
    <ShowcaseSection title="Switch">
      <div className="flex items-center gap-6">
        <Switch defaultChecked />
        <Switch />
        <Switch disabled />
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'radio-group', 'RadioGroup', () => (
    <ShowcaseSection title="RadioGroup">
      <RadioGroup defaultValue="public" className="gap-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="public" id="vis-public" />
          <ShadcnLabel htmlFor="vis-public">Public</ShadcnLabel>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="followers" id="vis-followers" />
          <ShadcnLabel htmlFor="vis-followers">Followers</ShadcnLabel>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="private" id="vis-private" />
          <ShadcnLabel htmlFor="vis-private">Private</ShadcnLabel>
        </div>
      </RadioGroup>
    </ShowcaseSection>
  )),
  showcase('atoms', 'separator', 'Separator', () => (
    <ShowcaseSection title="Separator">
      <div className="max-w-md space-y-3 text-sm">
        <p>Above</p>
        <Separator />
        <p>Below</p>
        <div className="flex h-8 items-center gap-3">
          Left
          <Separator orientation="vertical" />
          Right
        </div>
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'skeleton', 'Skeleton', () => (
    <ShowcaseSection title="Skeleton">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full max-w-xs" />
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'loaders', 'Loaders', () => (
    <ShowcaseSection title="Loaders">
      <div className="flex items-center gap-6">
        <LoadingSpinner />
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'link', 'Link', () => (
    <ShowcaseSection title="Link">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link action="#link">Internal action</Link>
        <Link action="https://openpeeps.org" newTab>
          External
        </Link>
        <Link disabled action="#disabled">
          Disabled
        </Link>
      </div>
    </ShowcaseSection>
  )),
  showcase('atoms', 'dates', 'Dates', () => (
    <ShowcaseSection
      title="Dates"
      description="UpdatingDate, Timespan, and StopWatch."
    >
      <div className="grid max-w-lg gap-2 text-sm">
        <p>
          <span className="text-muted-foreground">Relative: </span>
          <UpdatingDate date="2026-08-11T10:00:00.000Z" />
        </p>
        <p>
          <span className="text-muted-foreground">Timespan: </span>
          <Timespan
            start="2026-08-13T09:00:00.000Z"
            end="2026-08-13T11:30:00.000Z"
          />
        </p>
        <p>
          <span className="text-muted-foreground">Stopwatch: </span>
          <StopWatch start={Date.now() - 95_000} />
        </p>
      </div>
    </ShowcaseSection>
  )),
];
