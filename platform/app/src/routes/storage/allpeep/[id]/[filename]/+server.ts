import { mediaStorage } from '@openpeeps/core/media';
import type { RequestHandler } from '@sveltejs/kit';
import mime from 'mime-types';
import { notFound } from '$lib/server/helpers';
import { toArrayBuffer } from '@openpeeps/core/lib';

export const GET: RequestHandler = async ({ params: { id, filename, download = false } }) => {
  if (!id) {
    return notFound();
  }

  try {
    const data = await mediaStorage().then((ms) => ms.getData(id));

    const blob = new Blob([toArrayBuffer(data)], {
      type: (filename && mime.contentType(filename)) || undefined,
    });

    const defaultHeaders = {
      'Content-Type': blob.type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000',
      'Content-Length': blob.size.toString(),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
    };

    const headers = download ? { ...defaultHeaders, 'Content-Disposition': `attachment; filename="${filename}"` } : defaultHeaders;

    return new Response(blob, { headers });
  } catch {
    return notFound();
  }
};
