import { useJamContext } from './JamContext';
import { useOpenpeeps } from '../../contexts/openpeeps';

/**
 * Number of hidden external sessions in the jam room (observer links,
 * recording/RTMP web egress), as reported by the polled jam state. The count
 * is dropped entirely on servers predating the `observers` field, hence `?? 0`.
 */
export const useJamExternalSessions = () => {
  const { jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const stateQuery = openpeepsApi.useJamState(jamPost.id, occurrence);
  return stateQuery.data?.observers ?? 0;
};
