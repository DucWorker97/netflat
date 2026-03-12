export const ENCODE_QUEUE = 'encode';
export const ENCODE_JOB = 'encode-hls';

export interface EncodeJobData {
    movieId: string;
    objectKey: string;  // originals/{movieId}/{file}
}

/** HLS encoding profiles – 2 levels for đồ án demo */
export const HLS_PROFILES = [
    { name: '480p', width: 854, height: 480, videoBitrate: '1000k', audioBitrate: '128k', suffix: 'v0' },
    { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '192k', suffix: 'v1' },
] as const;
