import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  PostData,
  PostDataUnion,
  Profile,
} from '@openpeepshq/common/types';
import { createPost } from './mutations';
import { postsMapping } from './mapping';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));

const PARENT_ID = '01970000-0000-7000-8000-000000000001';
const profile = { id: 'creator-1' } as unknown as Profile;
const note = { type: 'note', content: 'hi' } as unknown as PostDataUnion;
const notePostData = {
  type: 'note',
  visibility: 'public',
  creatorId: 'creator-1',
} as unknown as PostData;

describe('createPost reply validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a reply whose parent post no longer exists', async () => {
    const find = vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    await expect(
      createPost(note, profile, notePostData, { inReplyToId: PARENT_ID }),
    ).rejects.toMatchObject({
      code: 404,
      errorKey: 'error.postDeleted',
    });
    expect(find).toHaveBeenCalledWith({}, PARENT_ID);
  });
});
