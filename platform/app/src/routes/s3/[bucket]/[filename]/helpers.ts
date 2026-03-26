export const decodeAwsChunked = (
    chunkedBuf: ArrayBuffer,
    plainSize: number = Number.MAX_SAFE_INTEGER
): ArrayBuffer => {
    const view = new Uint8Array(chunkedBuf);
    const out = new Uint8Array(plainSize); // may be larger than needed – we will trim later
    let outPos = 0;

    // Helper to read a line terminated by CRLF (\\r\\n)
    const readLine = (start: number): { line: string; nextIdx: number } => {
        for (let i = start; i + 1 < view.length; i++) {
            if (view[i] === 0x0d && view[i + 1] === 0x0a) {
                const lineBytes = view.subarray(start, i); // exclude CRLF
                const decoder = new TextDecoder(); // UTF‑8 works because the header is ASCII
                return { line: decoder.decode(lineBytes), nextIdx: i + 2 };
            }
        }
        throw new Error("Malformed aws‑chunked data – missing CRLF");
    }

    let idx = 0; // current read position in `view`

    while (idx < view.length) {
        // ---------- 1️⃣ Read the chunk header line ----------
        const { line: header, nextIdx } = readLine(idx);
        idx = nextIdx;

        // Header format: "<hex-size>[;chunk-signature=...]"   (signature part is optional for us)
        const semiPos = header.indexOf(";");
        const sizeHex = semiPos === -1 ? header : header.substring(0, semiPos);
        const chunkSize = parseInt(sizeHex, 16);

        if (Number.isNaN(chunkSize)) {
            throw new Error(`Invalid chunk size "${sizeHex}"`);
        }

        // ---------- 2️⃣ Zero‑length final chunk ----------
        if (chunkSize === 0) {
            // According to the spec there must be a final CRLF after the zero size line.
            // Consume it (if present) so we finish cleanly.
            const { nextIdx: afterFinalCrlf } = readLine(idx);
            idx = afterFinalCrlf;
            break; // end of stream
        }

        // ---------- 3️⃣ Copy the payload bytes ----------
        if (idx + chunkSize > view.length) {
            throw new Error("Chunk data exceeds supplied buffer length");
        }

        const toCopy = Math.min(chunkSize, plainSize - outPos);
        out.set(view.subarray(idx, idx + toCopy), outPos);
        outPos += toCopy;
        idx += chunkSize; // skip the payload we just consumed

        // If we have already collected the requested amount of data we can stop early.
        if (outPos >= plainSize) {
            // Still need to consume the trailing CRLF that follows this chunk,
            // otherwise the caller may think the buffer is still “in the middle” of a line.
            const { nextIdx: afterCrlf } = readLine(idx);
            idx = afterCrlf;
            break;
        }

        // ---------- 4️⃣ Consume the trailing CRLF ----------
        const { nextIdx: afterPayloadCrlf } = readLine(idx);
        idx = afterPayloadCrlf;
    }

    // Trim the output buffer to the exact number of bytes we actually wrote.
    return out.subarray(0, outPos).buffer;
}