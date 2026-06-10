// styles
import './styles/globals.css';

// utilities + types
export * from './lib';
export * from './types';

// shadcn primitives (low level)
export * as primitives from './components/ui';
export {
  ShadcnButton,
  buttonVariants,
  ShadcnBadge,
  badgeVariants,
  Input,
  Textarea,
  Label as ShadcnLabel,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Popover,
  PopoverTrigger,
  PopoverContent,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  ScrollBar,
  Separator,
  Skeleton,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './components/ui';

// OpenPeeps components (translated 1:1 from @openpeeps/ui)
export * from './components/badges';
export * from './components/button';
export * from './components/date';
export * from './components/expandable-box';
export * from './components/form';
export * from './components/icons';
export * from './components/infinite-scrolling';
export * from './components/link';
export * from './components/loaders';
export * from './components/modal';
export * from './components/popup-menu';
export * from './components/search';
export * from './components/table';
export * from './components/toast';
export * from './components/tooltip';

// theme generation utilities
export * from './theme';
