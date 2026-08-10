import { GroupCard } from '../../groups/GroupCard';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { LoadingSpinner } from '@openpeepshq/react-ui';

export interface GroupPreviewProps {
  path: string;
}

export function GroupPreview({ path }: GroupPreviewProps) {
  const handle = path.substring(9);
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);

  if (groupQuery.isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
          <LoadingSpinner />
      </div>
    );
  }

  if (!groupQuery.data) return null;

  return <GroupCard group={groupQuery.data} noPadding />;
}
