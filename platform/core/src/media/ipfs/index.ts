// import { unixfs } from '@helia/unixfs';
// import { createHelia } from 'helia';
// import { FsBlockstore } from 'blockstore-fs';
// import { CID } from 'multiformats';

// import type {MediaStorage, MediaStorageParams} from '@openpeeps/common/types';
//
// interface EnhancedReadableStream extends ReadableStream {
// 	from: <T> (iterable: Iterable<T> | AsyncIterable<T>) => ReadableStream<T>
// }
//
// const EnhancedReadableStreamObject = (ReadableStream as unknown) as EnhancedReadableStream;
//
// const ipfsStorage = async (params: MediaStorageParams): Promise<MediaStorage> => {
// 	// const helia = await createHelia({ blockstore: new FsBlockstore(params.path) });
// 	// const fs = unixfs(helia);
//
// 	const { path } = params;
//
// 	const fs = (path: string) => {
//
// 		const storagePath = path + '/.simpleDedupStorage';
//
// 		return {
// 			addBytes: (data: Uint8Array) => {
// 				const hash = sha512
// 			}
// 		};
// 	}
//
// 	return {
// 		store: async (data) => (await fs.addBytes(data)).toString(),
// 		load: (key) => fs.cat(CID.parse(key)),
// 		getPath: (id, filename) => `${params.host}${params.prefix}/ipfs/${id}/${filename}`,
// 		getStream: (id) => EnhancedReadableStreamObject.from(fs.cat(CID.parse(id))),
// 	};
// };
//
// export default ipfsStorage;
