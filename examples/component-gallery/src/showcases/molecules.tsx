import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mic, Pencil } from 'lucide-react';
import {
  AnalyticsInfoBadge,
  Badges,
  Button,
  DateRangeFilter,
  ExpandableBox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  MetricCard,
  PopupMenu,
  PopupMenuButton,
  PopupSection,
  PopupSeparator,
  primitives,
  RadioSelect,
  SearchAndFilterBar,
  SplitButtonMenu,
  Toast,
  Tooltip,
  type DateRangeValue,
  type PopupPlacement,
  type TooltipPosition,
} from '@openpeepshq/react-ui';
import { ShowcaseSection } from '@/components/ShowcaseSection';
import {
  VariantFrame,
  VariantPicker,
  useVariant,
} from '@/components/VariantPicker';
import { showcase } from '@/types';

const {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} = primitives;

const fieldSchema = z.object({
  email: z.string().email(),
});

const FormFieldShowcase = (): ReactElement => {
  const form = useForm({
    resolver: zodResolver(fieldSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });
  return (
    <Form {...form}>
      <form
        className="max-w-md space-y-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="you@email.org" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-muted-foreground text-xs">
          Type an invalid email to see FormMessage.
        </p>
      </form>
    </Form>
  );
};

const TooltipShowcase = (): ReactElement => {
  const positions: TooltipPosition[] = ['top', 'right', 'bottom', 'left'];
  return (
    <div className="flex flex-wrap gap-6 p-8">
      {positions.map((position) => (
        <Tooltip
          key={position}
          position={position}
          trigger={
            <Button variant="outline" size="sm" action={() => undefined}>
              {position}
            </Button>
          }
        >
          Tooltip on {position}
        </Tooltip>
      ))}
    </div>
  );
};

const DateRangeShowcase = (): ReactElement => {
  const [value, setValue] = useState<DateRangeValue>({ preset: '7d' });
  return (
    <div className="space-y-3">
      <DateRangeFilter value={value} onChange={setValue} />
      <DateRangeFilter value={value} onChange={setValue} compact />
    </div>
  );
};

const POPUP_PLACEMENTS: PopupPlacement[] = [
  'top',
  'top-start',
  'top-end',
  'right',
  'right-start',
  'right-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
];

const PopupMenuShowcase = (): ReactElement => {
  const [placement, setPlacement, options] = useVariant<PopupPlacement>(
    POPUP_PLACEMENTS.map((id) => ({ id, label: id })),
  );
  return (
    <VariantFrame
      picker={
        <VariantPicker
          label="Placement"
          value={placement}
          options={options}
          onChange={setPlacement}
        />
      }
    >
      <div className="flex min-h-40 flex-wrap items-center justify-center gap-4">
        <PopupMenu title="Actions" placement={placement}>
          <PopupSection title="Post" />
          <PopupMenuButton
            title="Edit"
            text="Edit"
            icon={Pencil}
            action={() => undefined}
          />
          <PopupSeparator />
          <PopupMenuButton
            title="Delete"
            text="Delete"
            danger
            action={() => undefined}
          />
        </PopupMenu>
        <SplitButtonMenu
          variant="default"
          title="Mute"
          action={() => undefined}
          menuChildren={
            <PopupMenuButton
              text="Switch microphone"
              action={() => undefined}
            />
          }
        >
          <Mic className="size-4" />
        </SplitButtonMenu>
      </div>
    </VariantFrame>
  );
};

const RadioSelectShowcase = (): ReactElement => {
  const [value, setValue] = useState('members');
  return (
    <RadioSelect
      title="Who can post events"
      description="Applies to this group."
      value={value}
      onChange={setValue}
      options={[
        {
          title: 'All members',
          description: 'Anyone in the group can create events.',
          value: 'members',
        },
        {
          title: 'Admins only',
          description: 'Only group admins can create events.',
          value: 'admins',
        },
      ]}
    />
  );
};

const SearchShowcase = (): ReactElement => {
  const [search, setSearch] = useState('market');
  return (
    <SearchAndFilterBar
      search={search}
      minLength={1}
      debounceTimeMs={0}
      onSearchChange={setSearch}
      placeholder="Search members"
    />
  );
};

export const moleculeShowcases = [
  showcase('molecules', 'form-field', 'Form field', () => (
    <ShowcaseSection
      title="Form field"
      description="react-hook-form Form + FormField + FormMessage."
    >
      <FormFieldShowcase />
    </ShowcaseSection>
  )),
  showcase(
    'molecules',
    'toast',
    'Toast',
    () => (
      <ShowcaseSection title="Toast">
        <div className="space-y-3">
          <Toast variant="success" inline duration={0}>
            Invite link copied
          </Toast>
          <Toast variant="error" inline duration={0}>
            Could not save settings
          </Toast>
        </div>
      </ShowcaseSection>
    ),
    'Success and error, pinned inline so they stay visible.',
  ),
  showcase('molecules', 'tooltip', 'Tooltip', () => (
    <ShowcaseSection title="Tooltip" description="All four placements.">
      <TooltipShowcase />
    </ShowcaseSection>
  )),
  showcase('molecules', 'search', 'SearchAndFilterBar', () => (
    <ShowcaseSection title="SearchAndFilterBar">
      <SearchShowcase />
    </ShowcaseSection>
  )),
  showcase(
    'molecules',
    'popup-menu',
    'PopupMenu',
    () => (
      <ShowcaseSection
        title="PopupMenu"
        description="Pick a placement. SplitButtonMenu sits beside it."
      >
        <PopupMenuShowcase />
      </ShowcaseSection>
    ),
    'Overflow menu and SplitButtonMenu (primary action + attached chevron).',
  ),
  showcase('molecules', 'dropdown-menu', 'DropdownMenu', () => (
    <ShowcaseSection title="DropdownMenu">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Open menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ShowcaseSection>
  )),
  showcase('molecules', 'radio-select', 'RadioSelect', () => (
    <ShowcaseSection title="RadioSelect">
      <RadioSelectShowcase />
    </ShowcaseSection>
  )),
  showcase('molecules', 'expandable-box', 'ExpandableBox', () => (
    <ShowcaseSection title="ExpandableBox">
      <ExpandableBox title={<p className="font-medium">Advanced SMTP</p>}>
        <p className="text-muted-foreground mt-2 text-sm">
          Host, port, and credentials live in this collapsed section.
        </p>
      </ExpandableBox>
    </ShowcaseSection>
  )),
  showcase('molecules', 'select', 'Select', () => (
    <ShowcaseSection title="Select">
      <Select defaultValue="public">
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Visibility" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public">Public</SelectItem>
          <SelectItem value="followers">Followers</SelectItem>
          <SelectItem value="private">Private</SelectItem>
        </SelectContent>
      </Select>
    </ShowcaseSection>
  )),
  showcase('molecules', 'tabs', 'Tabs', () => (
    <ShowcaseSection title="Tabs">
      <Tabs defaultValue="posts" className="max-w-md">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">Local feed posts.</TabsContent>
        <TabsContent value="members">People in this group.</TabsContent>
        <TabsContent value="about">Group description.</TabsContent>
      </Tabs>
    </ShowcaseSection>
  )),
  showcase('molecules', 'card', 'Card', () => (
    <ShowcaseSection title="Card">
      <Card className="text-foreground max-w-sm">
        <CardHeader>
          <CardTitle>Neighborhood cleanup</CardTitle>
          <CardDescription>Saturday 9:00 at the park gate.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">Bring gloves and water.</CardContent>
        <CardFooter>
          <Button size="sm" action={() => undefined}>
            RSVP
          </Button>
        </CardFooter>
      </Card>
    </ShowcaseSection>
  )),
  showcase('molecules', 'avatar-primitive', 'Avatar (primitive)', () => (
    <ShowcaseSection
      title="Avatar"
      description="shadcn Avatar primitive. Domain profile avatars are under Organisms."
    >
      <Avatar>
        <AvatarImage src="https://api.dicebear.com/9.x/initials/svg?seed=AR" />
        <AvatarFallback>AR</AvatarFallback>
      </Avatar>
    </ShowcaseSection>
  )),
  showcase('molecules', 'badges', 'Badges', () => (
    <ShowcaseSection title="Badges">
      <Badges
        data={[
          { status: 'Live', variant: 'success' },
          { status: 'Draft', variant: 'warning' },
          { status: 'Archived', variant: 'outline' },
        ]}
      />
    </ShowcaseSection>
  )),
  showcase('molecules', 'popover', 'Popover', () => (
    <ShowcaseSection title="Popover">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent>Invite expires in 7 days.</PopoverContent>
      </Popover>
    </ShowcaseSection>
  )),
  showcase('molecules', 'scroll-area', 'ScrollArea', () => (
    <ShowcaseSection title="ScrollArea">
      <ScrollArea className="h-32 w-64 rounded-md border p-3">
        {Array.from({ length: 16 }, (_, index) => (
          <p key={index} className="text-sm">
            Line {index + 1}
          </p>
        ))}
      </ScrollArea>
    </ShowcaseSection>
  )),
  showcase('molecules', 'table-primitive', 'Table (primitive)', () => (
    <ShowcaseSection
      title="Table"
      description="shadcn table primitives. The data Table lives under Organisms."
    >
      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alex</TableCell>
            <TableCell>Admin</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Sam</TableCell>
            <TableCell>Member</TableCell>
          </TableRow>
        </TableBody>
      </TableRoot>
    </ShowcaseSection>
  )),
  showcase('molecules', 'metric-card', 'MetricCard', () => (
    <ShowcaseSection title="MetricCard">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Active members"
          value={148}
          deltaPct={12}
          subtitle="This week"
          info="Members who posted or reacted"
        />
        <MetricCard
          label="Posts"
          value={36}
          deltaPct={-4}
          subtitle="This week"
        />
      </div>
    </ShowcaseSection>
  )),
  showcase('molecules', 'analytics-info', 'AnalyticsInfoBadge', () => (
    <ShowcaseSection title="AnalyticsInfoBadge">
      <div className="flex items-center gap-2 text-sm">
        Active members
        <AnalyticsInfoBadge
          label="Active members"
          info="Count of profiles that posted or reacted in the selected range."
        />
      </div>
    </ShowcaseSection>
  )),
  showcase('molecules', 'date-range-filter', 'DateRangeFilter', () => (
    <ShowcaseSection
      title="DateRangeFilter"
      description="Default and compact header control."
    >
      <DateRangeShowcase />
    </ShowcaseSection>
  )),
];
