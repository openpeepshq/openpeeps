import { useEffect, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsDayHeatmap,
  AnalyticsDonutChart,
  AnalyticsHeatmap,
  AnalyticsLineChart,
  AnalyticsMultiLineChart,
  AnalyticsStackedAreaChart,
  AnalyticsStackedBarChart,
  Button,
  DialogActions,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  ModalHeader,
  ModalWrapper,
  Table,
  getModalManager,
  primitives,
  type ChartPoint,
  type HeatmapCell,
  type ModalControlProps,
  type StackedSeries,
} from '@openpeepshq/react-ui';
import { ShowcaseSection } from '@/components/ShowcaseSection';
import {
  VariantFrame,
  VariantPicker,
  useVariant,
} from '@/components/VariantPicker';
import { showcase } from '@/types';

const {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} = primitives;

type OverlayId = 'dialog' | 'alert' | 'sheet' | 'modal';

const SampleModal = ({ close }: ModalControlProps): ReactElement => (
  <ModalWrapper>
    <ModalHeader title="Invite a neighbor" />
    <div className="p-4 text-sm">
      Send an invite link so they can join this group.
    </div>
    <DialogActions
      cancelLabel="Cancel"
      onCancel={close}
      actionLabel="Send invite"
      onAction={close}
    />
  </ModalWrapper>
);

const OverlayShowcase = (): ReactElement => {
  const [variant, setVariant, options] = useVariant<OverlayId>([
    { id: 'dialog', label: 'Dialog' },
    { id: 'alert', label: 'AlertDialog' },
    { id: 'sheet', label: 'Sheet' },
    { id: 'modal', label: 'Modal (manager)' },
  ]);

  useEffect(() => {
    getModalManager().closeAll();
  }, [variant]);

  return (
    <VariantFrame
      picker={
        <VariantPicker
          label="Overlay"
          value={variant}
          options={options}
          onChange={setVariant}
        />
      }
    >
      {variant === 'dialog' ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm cleanup</DialogTitle>
              <DialogDescription>
                Saturday street cleanup starts at 9:00. Bring gloves.
              </DialogDescription>
            </DialogHeader>
            <DialogActions
              cancelLabel="Cancel"
              onCancel={() => undefined}
              actionLabel="I am in"
              onAction={() => undefined}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {variant === 'alert' ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete group</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this group?</AlertDialogTitle>
              <AlertDialogDescription>
                Posts stay in member feeds. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {variant === 'sheet' ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Group details</SheetTitle>
              <SheetDescription>
                Side panel chrome. Sheet currently re-exports Dialog.
              </SheetDescription>
            </SheetHeader>
            <p className="text-sm">Members, rules, and pinned posts.</p>
            <DialogActions actionLabel="Done" onAction={() => undefined} />
          </SheetContent>
        </Sheet>
      ) : null}
      {variant === 'modal' ? (
        <div className="space-y-3">
          <Modal />
          <Button
            action={() => {
              getModalManager().show(SampleModal);
            }}
          >
            Open modal
          </Button>
          <p className="text-muted-foreground text-xs">
            Uses getModalManager().show with ModalHeader / Footer / Wrapper.
          </p>
        </div>
      ) : null}
    </VariantFrame>
  );
};

const CHART_POINTS: ChartPoint[] = [
  { label: 'Mon', value: 12, posts: 8, comments: 12 },
  { label: 'Tue', value: 19, posts: 14, comments: 9 },
  { label: 'Wed', value: 8, posts: 5, comments: 16 },
  { label: 'Thu', value: 22, posts: 11, comments: 18 },
  { label: 'Fri', value: 15, posts: 9, comments: 7 },
];

const CHART_SERIES: StackedSeries[] = [
  { key: 'posts', label: 'Posts', color: '#2563eb' },
  { key: 'comments', label: 'Comments', color: '#16a34a' },
];

const DONUT = [
  { label: 'Notes', value: 42 },
  { label: 'Events', value: 18 },
  { label: 'Polls', value: 9 },
];

const HEATMAP: HeatmapCell[] = [1, 2, 3, 4, 5].flatMap((dow) =>
  [8, 9, 10, 11, 14, 15, 16].map((hour) => ({
    dow,
    hour,
    value: ((dow + hour) % 6) + 1,
  })),
);

const DAY_HEATMAP = Array.from({ length: 28 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 6, 17 + index));
  return {
    day: date.toISOString().slice(0, 10),
    value: (index * 5) % 9,
  };
});

type ChartId =
  | 'bar'
  | 'line'
  | 'area'
  | 'stacked-bar'
  | 'multi-line'
  | 'stacked-area'
  | 'donut'
  | 'heatmap'
  | 'day-heatmap';

const ChartsShowcase = (): ReactElement => {
  const [variant, setVariant, options] = useVariant<ChartId>([
    { id: 'bar', label: 'Bar' },
    { id: 'line', label: 'Line' },
    { id: 'area', label: 'Area' },
    { id: 'stacked-bar', label: 'Stacked bar' },
    { id: 'multi-line', label: 'Multi-line' },
    { id: 'stacked-area', label: 'Stacked area' },
    { id: 'donut', label: 'Donut' },
    { id: 'heatmap', label: 'Hour heatmap' },
    { id: 'day-heatmap', label: 'Day heatmap' },
  ]);

  return (
    <VariantFrame
      picker={
        <VariantPicker
          label="Chart"
          value={variant}
          options={options}
          onChange={setVariant}
        />
      }
    >
      {variant === 'bar' ? (
        <AnalyticsBarChart data={CHART_POINTS} height={220} />
      ) : null}
      {variant === 'line' ? (
        <AnalyticsLineChart data={CHART_POINTS} height={220} />
      ) : null}
      {variant === 'area' ? (
        <AnalyticsAreaChart data={CHART_POINTS} height={220} />
      ) : null}
      {variant === 'stacked-bar' ? (
        <AnalyticsStackedBarChart
          data={CHART_POINTS}
          series={CHART_SERIES}
          height={220}
        />
      ) : null}
      {variant === 'multi-line' ? (
        <AnalyticsMultiLineChart
          data={CHART_POINTS}
          series={CHART_SERIES}
          height={220}
        />
      ) : null}
      {variant === 'stacked-area' ? (
        <AnalyticsStackedAreaChart
          data={CHART_POINTS}
          series={CHART_SERIES}
          height={220}
        />
      ) : null}
      {variant === 'donut' ? (
        <AnalyticsDonutChart data={DONUT} height={220} />
      ) : null}
      {variant === 'heatmap' ? <AnalyticsHeatmap data={HEATMAP} /> : null}
      {variant === 'day-heatmap' ? (
        <AnalyticsDayHeatmap data={DAY_HEATMAP} />
      ) : null}
    </VariantFrame>
  );
};

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
});

const FormShowcase = (): ReactElement => {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '' },
    mode: 'onSubmit',
  });

  return (
    <Form {...form}>
      <form
        className="max-w-md space-y-4"
        onSubmit={form.handleSubmit(() => undefined)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Alex Rivera" />
              </FormControl>
              <FormDescription>Shown on your public profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
};

export const organismShowcases = [
  showcase(
    'organisms',
    'overlays',
    'Overlays',
    () => (
      <ShowcaseSection
        title="Overlays"
        description="Dialog, AlertDialog, Sheet, and the modal manager stack."
      >
        <OverlayShowcase />
      </ShowcaseSection>
    ),
    'Pick a variant from the dropdown. Charts and overlays are too large to show all at once.',
  ),
  showcase('organisms', 'table', 'Table', () => (
    <ShowcaseSection
      title="Table"
      description="OpenPeeps Table with column definitions."
    >
      <Table
        data={[
          { name: 'Alex', role: 'Admin' },
          { name: 'Sam', role: 'Member' },
          { name: 'Jordan', role: 'Moderator' },
        ]}
        columnDefinitions={[
          { id: 'name', type: 'property', header: 'Name' },
          { id: 'role', type: 'property', header: 'Role' },
        ]}
      />
    </ShowcaseSection>
  )),
  showcase('organisms', 'charts', 'Analytics charts', () => (
    <ShowcaseSection
      title="Analytics charts"
      description="Bar, line, area, stacked, donut, and heatmaps."
    >
      <ChartsShowcase />
    </ShowcaseSection>
  )),
  showcase('organisms', 'form', 'Form', () => (
    <ShowcaseSection
      title="Form"
      description="Full react-hook-form surface with submit."
    >
      <FormShowcase />
    </ShowcaseSection>
  )),
];
