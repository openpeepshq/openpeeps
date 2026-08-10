import { Link, Outlet } from 'react-router-dom';
import { useT } from '@openpeepshq/react';
import { useCurrentProfile } from '@openpeepshq/react/components';
import {
  adminSections,
  canAccessAdminMenu,
  canAccessAdminSection,
  type AdminSectionKey,
} from '@openpeepshq/common/lib';

function AdminAccessDenied() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
      <h1 className="text-error text-2xl font-semibold">
        {t('admin.accessDenied.title', { defaultValue: 'Access denied' })}
      </h1>
      <p className="text-muted-foreground text-sm">
        {t('admin.accessDenied.description', {
          defaultValue:
            'You do not have permission to view this part of the administration area.',
        })}
      </p>
      <Link to="/" className="text-primary text-sm underline">
        {t('common.backHome', { defaultValue: 'Back home' })}
      </Link>
    </div>
  );
}

const useAdminRoles = () => {
  const profile = useCurrentProfile();
  return profile?.type === 'local' ? profile.roles : undefined;
};

/**
 * Layout guard for a single admin section. Renders the nested route only when
 * the current profile holds the section's capabilities (mirrors the backend
 * `ensureRoleCapabilities` checks via `adminSections`); otherwise shows an
 * access-denied page. Used to keep direct URL navigation in sync with the
 * capability-filtered sidebar.
 */
export function RequireAdminSection({ section }: { section: AdminSectionKey }) {
  const roles = useAdminRoles();
  const sectionDef = adminSections.find((s) => s.key === section);
  const allowed = !!sectionDef && canAccessAdminSection(roles, sectionDef);
  return allowed ? <Outlet /> : <AdminAccessDenied />;
}

/** Layout guard for the admin landing page: any visible section grants access. */
export function RequireAdminMenu() {
  const roles = useAdminRoles();
  return canAccessAdminMenu(roles) ? <Outlet /> : <AdminAccessDenied />;
}
