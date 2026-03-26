  import { getModalManager, Button, type IconType } from '@openpeeps/ui';
  import { toaster } from '$lib/utils';
  import { getCurrentProfile } from '$lib/auth';
  import { groupByHandleStore } from '$lib/api';

  const modalManager = getModalManager();
  const toast = toaster();
  const me = getCurrentProfile();
