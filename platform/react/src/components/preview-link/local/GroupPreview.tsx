import { GroupCard } from '../../groups/GroupCard';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';

export interface GroupPreviewProps {
  path: string;
}

export function GroupPreview({ path }: GroupPreviewProps) {
  const t = useT();
  const handle = path.substring(9);
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);

  if (groupQuery.isLoading) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </p>
    );
  }

  if (!groupQuery.data) return null;

  return <GroupCard group={groupQuery.data} noPadding />;
}
