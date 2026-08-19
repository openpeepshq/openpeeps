// styles
import './styles/globals.css';

// utilities + types
export * from './lib';
export * from './types';

// shadcn primitives (low level)
export * as primitives from './components/ui';
export {
  ShadcnBadge,
  badgeVariants,
  Input,
  Textarea,
  Label as ShadcnLabel,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Checkbox,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogActions,
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
  PopoverAnchor,
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
  LoadingSpinner,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
} from './components/ui';

// OpenPeeps components (translated 1:1 from @openpeepshq/ui)
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

// analytics primitives
export * from './components/analytics';

// theme generation utilities
export * from './theme';
