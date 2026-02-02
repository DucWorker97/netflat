const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@netflop.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ENCODE_TIMEOUT = parseInt(process.env.ENCODE_TIMEOUT || '900', 10) * 1000;
const POLLING_INTERVAL = 5000;

const REQUEST_ID = crypto.randomUUID();
const SAMPLES_DIR = path.join(__dirname, '../../samples');
const ARTIFACTS_DIR = path.join(__dirname, '../../artifacts');
const TEST_VIDEO_PATH = path.join(SAMPLES_DIR, 'smoke-test.mp4');
const REPORT_FILE = path.join(ARTIFACTS_DIR, 'video-smoke-report.json');

// Ensure directories
if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Logger
const log = (step, msg) => console.log(`[${new Date().toISOString()}] [${step}] ${msg}`);
const fail = (msg) => {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
};

// Create dummy video if needed
if (!fs.existsSync(TEST_VIDEO_PATH)) {
    log('SETUP', 'Creating dummy video file...');
    // Create a 1MB dummy file
    const buffer = Buffer.alloc(1024 * 1024);
    buffer.fill('fake-video-content');
    fs.writeFileSync(TEST_VIDEO_PATH, buffer);
}

async function run() {
    log('START', `Request ID: ${REQUEST_ID}`);

    try {
        // 1. Login
        log('AUTH', 'Logging in as Admin...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Request-Id': REQUEST_ID },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });

        if (!loginRes.ok) fail(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        // Handle wrapper
        const token = loginData.data?.accessToken || loginData.accessToken || loginData.access_token;
        if (!token) {
            console.error('Login Data:', JSON.stringify(loginData));
            fail('No access token returned');
        }

        // 2. Create Movie
        log('MOVIE', 'Creating draft movie...');
        const createRes = await fetch(`${API_URL}/api/movies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Request-Id': REQUEST_ID
            },
            body: JSON.stringify({ title: `Smoke Test ${REQUEST_ID}`, releaseYear: 2026, genreIds: [] })
        });

        if (!createRes.ok) fail(`Create movie failed: ${createRes.status} ${await createRes.text()}`);
        const movieData = await createRes.json();
        const movieId = movieData.data?.id || movieData.id;
        log('MOVIE', `Movie ID: ${movieId}`);

        // 3. Presigned URL
        log('UPLOAD', 'Requesting presigned URL...');
        const stats = fs.statSync(TEST_VIDEO_PATH);
        const fileName = path.basename(TEST_VIDEO_PATH);
        const params = new URLSearchParams({
            fileName,
            contentType: 'video/mp4',
            sizeBytes: stats.size.toString(),
            movieId
        });

        const presignRes = await fetch(`${API_URL}/api/upload/presigned-url?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Request-Id': REQUEST_ID }
        });

        if (!presignRes.ok) fail(`Presign failed: ${presignRes.status} ${await presignRes.text()}`);
        const presignData = await presignRes.json();
        const uploadUrl = presignData.data?.uploadUrl || presignData.uploadUrl;
        const objectKey = presignData.data?.objectKey || presignData.objectKey;

        if (!uploadUrl) {
            console.error('Presign Data:', JSON.stringify(presignData));
            fail('No upload URL returned');
        }
        log('UPLOAD', `Object Key: ${objectKey}`);

        // 4. Upload to S3/MinIO
        log('UPLOAD', 'Uploading file to storage...');
        const fileContent = fs.readFileSync(TEST_VIDEO_PATH);
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'video/mp4' },
            body: fileContent
        });

        if (!uploadRes.ok) fail(`Upload to S3 failed: ${uploadRes.status}`);
        log('UPLOAD', 'Upload complete');

        // 5. Notify Complete
        log('ENCODE', 'Notifying API of upload completion...');
        const completeRes = await fetch(`${API_URL}/api/movies/${movieId}/upload-complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Request-Id': REQUEST_ID
            },
            body: JSON.stringify({ objectKey, fileType: 'video' })
        });

        if (!completeRes.ok) fail(`Notify complete failed: ${completeRes.status} ${await completeRes.text()}`);
        const completeData = await completeRes.json();
        const jobId = completeData.data?.jobId || completeData.jobId;
        log('ENCODE', `Job ID: ${jobId}, Status: ${completeData.data?.encodeStatus}`);

        // 6. Poll Status
        log('POLL', 'Waiting for READY status...');
        const startTime = Date.now();
        let finalStatus = 'pending';
        let playbackUrl = '';
        let variantUrl = '';

        while (Date.now() - startTime < ENCODE_TIMEOUT) {
            const pollRes = await fetch(`${API_URL}/api/movies/${movieId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-Request-Id': REQUEST_ID }
            });
            const pollData = await pollRes.json();
            const movie = pollData.data || pollData;
            finalStatus = movie.encodeStatus;

            if (finalStatus === 'ready') {
                const streamRes = await fetch(`${API_URL}/api/movies/${movieId}/stream`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'X-Request-Id': REQUEST_ID }
                });
                if (!streamRes.ok) fail(`Stream URL failed: ${streamRes.status} ${await streamRes.text()}`);
                const streamData = await streamRes.json();
                playbackUrl = streamData.data?.playbackUrl || streamData.playbackUrl || '';
                variantUrl = streamData.data?.qualityOptions?.[0]?.url || '';
                break;
            }
            if (finalStatus === 'failed') {
                fail('Encoding failed');
            }

            // progress
            process.stdout.write('.');
            await new Promise(r => setTimeout(r, POLLING_INTERVAL));
        }

        if (finalStatus !== 'ready') fail('Timeout waiting for encoding');

        log('\nSUCCESS', `Encoding READY. Playback URL: ${playbackUrl}`);

        // 7. Verify Playback URL (master -> variant -> segment)
        log('VERIFY', 'Checking playlist accessibility...');
        if (!playbackUrl) fail('No playbackUrl returned from stream endpoint');

        const masterRes = await fetch(playbackUrl);
        if (!masterRes.ok) fail(`Master playlist fetch failed: ${masterRes.status}`);
        const masterText = await masterRes.text();

        if (!variantUrl) {
            const variantLine = masterText.split('\n').find((line) => line.trim() && !line.startsWith('#'));
            if (!variantLine) fail('No variant playlist found in master.m3u8');
            if (variantLine.startsWith('http')) {
                variantUrl = variantLine.trim();
            } else {
                const base = playbackUrl.split('?')[0].split('/').slice(0, -1).join('/');
                variantUrl = `${base}/${variantLine.trim()}`;
            }
        }

        const variantRes = await fetch(variantUrl);
        if (!variantRes.ok) fail(`Variant playlist fetch failed: ${variantRes.status}`);
        const variantText = await variantRes.text();
        const segmentLine = variantText.split('\n').find((line) => line.trim() && !line.startsWith('#'));
        if (!segmentLine) fail('No segment found in variant playlist');

        let segmentUrl = '';
        if (segmentLine.startsWith('http')) {
            segmentUrl = segmentLine.trim();
        } else {
            const vbase = variantUrl.split('?')[0].split('/').slice(0, -1).join('/');
            segmentUrl = `${vbase}/${segmentLine.trim()}`;
        }

        const segmentRes = await fetch(segmentUrl);
        if (!segmentRes.ok) fail(`Segment fetch failed: ${segmentRes.status}`);
        log('VERIFY', 'Master/variant/segment accessible');

        // Report
        const report = {
            timestamp: new Date().toISOString(),
            requestId: REQUEST_ID,
            movieId,
            jobId,
            objectKey,
            playbackUrl,
            status: 'PASSED'
        };
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
        log('REPORT', `Saved to ${REPORT_FILE}`);

    } catch (error) {
        fail(`Unexpected error: ${error.message}`);
    }
}

run();
