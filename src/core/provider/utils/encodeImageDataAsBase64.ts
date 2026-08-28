export function encodeImageDataAsBase64(data: string | ArrayBuffer | Buffer): string {
    if (typeof data === 'string') return data
    return Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64')
}
