import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileGuard } from '@openpeeps/react/components';
import { useOpenpeeps } from '@openpeeps/react';

export function AdminDb() {
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const tokenQuery = openpeepsApi.admin.useDbToken();

  useEffect(() => {
    if (tokenQuery.data?.token) {
      window.location.href = `/_db?token=${encodeURIComponent(tokenQuery.data.token)}`;
      return;
    }
    if (tokenQuery.isError) {
      navigate('/');
    }
  }, [tokenQuery.data, tokenQuery.isError, navigate]);

  return (
    <ProfileGuard neededCapabilities={['core-db-access']}>
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Opening database browser…
      </div>
    </ProfileGuard>
  );
}
