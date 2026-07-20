import type { ObjectSort } from '../map/queryTypes';

export const sorts = {
  idDesc: [['id', 'DESC']] as ObjectSort,
  idAsc: [['id', 'ASC']] as ObjectSort,
  createdAtDesc: [['createdAt', 'DESC']] as ObjectSort,
  eventStartAsc: [['data.start', 'ASC']] as ObjectSort,
  eventStartDesc: [['data.start', 'DESC']] as ObjectSort,
  activityScoreDesc: [['activityScore', 'DESC']] as ObjectSort,
  lastPostAtDesc: [['lastPostAt', 'DESC']] as ObjectSort,
};
