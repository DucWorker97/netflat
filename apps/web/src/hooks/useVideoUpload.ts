import { useState, useRef, useCallback } from 'react';

interface UseVideoUploadResult {
    uploadProgress: number;
    isUploading: boolean;
    error: string | null;
    uploadVideo: (file: File, movieId: string) => Promise<void>;
    abortUpload: () => void;
}

interface PresignedUrlResponse {
    uploadUrl: string;
    objectKey: string;
    expiresAt: string;
}

export function useVideoUpload(): UseVideoUploadResult {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null);

    const abortUpload = useCallback(() => {
        if (xhrRef.current) {
            xhrRef.current.abort();
            xhrRef.current = null;
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, []);

    const uploadVideo = useCallback(async (file: File, movieId: string) => {
        setIsUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            // 1. Get Presigned URL
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication required');

            const presignRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/movies/upload-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    movieId,
                    fileName: file.name,
                    contentType: file.type,
                    sizeBytes: file.size,
                    fileType: 'video',
                }),
            });

            if (!presignRes.ok) {
                const err = await presignRes.json();
                throw new Error(err.message || 'Failed to get upload URL');
            }

            const { uploadUrl, objectKey }: PresignedUrlResponse = await presignRes.json();

            // 2. Upload to S3 using XHR for progress
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhrRef.current = xhr;

                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        setUploadProgress(Math.min(99, percentComplete)); // Keep 100% for completion
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.onabort = () => reject(new Error('Upload aborted'));

                xhr.send(file);
            });

            // 3. Notify API of completion
            const completeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/upload-complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    movieId,
                    objectKey,
                    fileType: 'video',
                }),
            });

            if (!completeRes.ok) {
                const err = await completeRes.json();
                throw new Error(err.message || 'Failed to complete upload');
            }

            setUploadProgress(100);
        } catch (err: any) {
            if (err.message !== 'Upload aborted') {
                setError(err.message || 'An unexpected error occurred');
                console.error('Upload error:', err);
            }
        } finally {
            setIsUploading(false);
            xhrRef.current = null;
        }
    }, []);

    return {
        uploadProgress,
        isUploading,
        error,
        uploadVideo,
        abortUpload,
    };
}
