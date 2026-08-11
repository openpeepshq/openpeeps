/**
 * Sheet is a side-anchored dialog. For now we re-export Dialog building blocks
 * with sheet-oriented class helpers; hosts can compose side panels.
 */
export {
  Dialog as Sheet,
  DialogPortal as SheetPortal,
  DialogOverlay as SheetOverlay,
  DialogTrigger as SheetTrigger,
  DialogClose as SheetClose,
  DialogContent as SheetContent,
  DialogHeader as SheetHeader,
  DialogFooter as SheetFooter,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
} from './dialog';
