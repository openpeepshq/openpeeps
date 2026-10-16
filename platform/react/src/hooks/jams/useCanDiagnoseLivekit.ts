import { useCanAccessAdminSection } from '../admin/useCanAccessAdminSection';

/** Admins who can open Diagnostics can see why LiveKit failed. */
export const useCanDiagnoseLivekit = () =>
  useCanAccessAdminSection('diagnostics');
