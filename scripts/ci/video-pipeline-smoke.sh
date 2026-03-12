#!/usr/bin/env bash
# ==============================================================================
# scripts/ci/video-pipeline-smoke.sh - E2E Video Pipeline Test (Nightly/Manual)
# ==============================================================================
set -euo pipefail

# Load helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

trap cleanup EXIT

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
API_URL="${API_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@NETFLAT.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
ENCODE_TIMEOUT="${ENCODE_TIMEOUT:-900}"
ARTIFACTS_DIR="artifacts"

SAMPLES_DIR="samples"
TEST_VIDEO="NETFLAT-smoke.mp4"

# Generate Request ID for end-to-end correlation
REQUEST_ID=$(node -e 'console.log(crypto.randomUUID())' 2>/dev/null || echo "smoke-$(date +%s)")

mkdir -p "$SAMPLES_DIR" "$ARTIFACTS_DIR"

log_step "SMOKE TEST: $REQUEST_ID"

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

create_test_video() {
    log_step "Creating Test Video"
    
    mkdir -p "$SAMPLES_DIR"
    if [[ -f "${SAMPLES_DIR}/${TEST_VIDEO}" ]]; then
        return 0
    fi
    
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -y -f lavfi -i testsrc=duration=5:size=640x360:rate=30 \
            -f lavfi -i sine=frequency=1000:duration=5 \
            -c:v libx264 -preset ultrafast -c:a aac -shortest \
            "${SAMPLES_DIR}/${TEST_VIDEO}" 2>/dev/null
    else
        log_warn "ffmpeg not found, creating dummy file"
        echo "dummy video content" > "${SAMPLES_DIR}/${TEST_VIDEO}"
    fi
}

login_admin() {
    log_step "Authenticating as Admin"
    
    local response
    response=$(curl -s -X POST "${API_URL}/api/auth/login" \
        -H "X-Request-Id: ${REQUEST_ID}" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")
    
    ADMIN_TOKEN=$(echo "$response" | jq -r '.data.accessToken // .accessToken // .access_token // empty')
    
    if [[ -z "$ADMIN_TOKEN" ]]; then
        fail "Failed to authenticate. Response: $response"
    fi
}

create_movie() {
    log_step "Creating Test Movie"
    
    local response
    response=$(curl -s -X POST "${API_URL}/api/movies" \
        -H "X-Request-Id: ${REQUEST_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{ "title": "Smoke Test Movie ('"$REQUEST_ID"')", "releaseYear": 2026, "genreIds": [] }')
    
    MOVIE_ID=$(echo "$response" | jq -r '.data.id // .id // empty')
    
    if [[ -z "$MOVIE_ID" ]]; then
        fail "Failed to create movie. Response: $response"
    fi
    log_info "Movie ID: $MOVIE_ID"
}

get_presigned_url() {
    log_step "Getting Presigned URL"
    
    local file_size
    file_size=$(stat -c%s "${SAMPLES_DIR}/${TEST_VIDEO}" 2>/dev/null || wc -c < "${SAMPLES_DIR}/${TEST_VIDEO}")
    
    local response
    response=$(curl -s -G "${API_URL}/api/upload/presigned-url" \
        -H "X-Request-Id: ${REQUEST_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        --data-urlencode "fileName=${TEST_VIDEO}" \
        --data-urlencode "contentType=video/mp4" \
        --data-urlencode "sizeBytes=${file_size}" \
        --data-urlencode "movieId=${MOVIE_ID}")
    
    UPLOAD_URL=$(echo "$response" | jq -r '.data.uploadUrl // .uploadUrl // empty')
    OBJECT_KEY=$(echo "$response" | jq -r '.data.objectKey // .objectKey // empty')
    
    if [[ -z "$UPLOAD_URL" ]]; then
        # fallback for old API structure
        UPLOAD_URL=$(echo "$response" | jq -r '.uploadUrl // empty')
        OBJECT_KEY=$(echo "$response" | jq -r '.objectKey // empty')
    fi

    if [[ -z "$UPLOAD_URL" ]]; then
        fail "Failed to get presigned URL. Response: $response"
    fi
    log_info "Object Key: $OBJECT_KEY"
}

upload_video() {
    log_step "Uploading Video to Storage"
    
    curl -s -X PUT "$UPLOAD_URL" \
        -H "Content-Type: video/mp4" \
        --upload-file "${SAMPLES_DIR}/${TEST_VIDEO}" \
        -o /dev/null
        
    log_success "Upload to MinIO/S3 completed"
}

notify_upload_complete() {
    log_step "Notifying API (Upload Complete)"
    
    local response
    response=$(curl -s -X POST "${API_URL}/api/movies/${MOVIE_ID}/upload-complete" \
        -H "X-Request-Id: ${REQUEST_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"objectKey\":\"${OBJECT_KEY}\", \"fileType\":\"video\"}")
    
    JOB_ID=$(echo "$response" | jq -r '.data.jobId // .jobId // empty')
    ENCODE_STATUS=$(echo "$response" | jq -r '.data.encodeStatus // .encodeStatus // empty')
    
    log_info "Job ID: ${JOB_ID:-unknown}"
    log_info "Initial Status: $ENCODE_STATUS"
}

get_stream_info() {
    log_step "Fetching Stream URL"

    local response
    response=$(curl -s "${API_URL}/api/movies/${MOVIE_ID}/stream" \
        -H "X-Request-Id: ${REQUEST_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}")

    PLAYBACK_URL=$(echo "$response" | jq -r '.data.playbackUrl // .playbackUrl // empty')
    VARIANT_URL=$(echo "$response" | jq -r '.data.qualityOptions[0].url // empty')

    if [[ -z "$PLAYBACK_URL" ]]; then
        fail "Failed to get stream URL. Response: $response"
    fi
}

verify_playback() {
    log_step "Verifying Master -> Variant -> Segment"

    local master_code
    master_code=$(curl -s -o /dev/null -w "%{http_code}" "$PLAYBACK_URL")
    if [[ "$master_code" != "200" ]]; then
        fail "Master playlist not accessible (HTTP $master_code): $PLAYBACK_URL"
    fi

    local variant_url="$VARIANT_URL"
    if [[ -z "$variant_url" ]]; then
        local master_body
        master_body=$(curl -s "$PLAYBACK_URL")
        local variant_line
        variant_line=$(echo "$master_body" | grep -v '^#' | head -n 1 | tr -d '\r')
        if [[ -z "$variant_line" ]]; then
            fail "No variant playlist found in master.m3u8"
        fi
        if [[ "$variant_line" == http* ]]; then
            variant_url="$variant_line"
        else
            local base="${PLAYBACK_URL%%\?*}"
            base="${base%/*}"
            variant_url="${base}/${variant_line}"
        fi
    fi

    local variant_code
    variant_code=$(curl -s -o /dev/null -w "%{http_code}" "$variant_url")
    if [[ "$variant_code" != "200" ]]; then
        fail "Variant playlist not accessible (HTTP $variant_code): $variant_url"
    fi

    local variant_body
    variant_body=$(curl -s "$variant_url")
    local segment_line
    segment_line=$(echo "$variant_body" | grep -v '^#' | head -n 1 | tr -d '\r')
    if [[ -z "$segment_line" ]]; then
        fail "No segments found in variant playlist"
    fi

    local segment_url
    if [[ "$segment_line" == http* ]]; then
        segment_url="$segment_line"
    else
        local vbase="${variant_url%%\?*}"
        vbase="${vbase%/*}"
        segment_url="${vbase}/${segment_line}"
    fi

    local segment_code
    segment_code=$(curl -s -o /dev/null -w "%{http_code}" "$segment_url")
    if [[ "$segment_code" != "200" ]]; then
        fail "Segment not accessible (HTTP $segment_code): $segment_url"
    fi

    log_success "Playback assets accessible"
}

wait_for_encoding() {
    log_step "Waiting for Encoding..."
    
    local start_time=$(date +%s)
    
    while true; do
        local elapsed=$(($(date +%s) - start_time))
        if [[ $elapsed -ge $ENCODE_TIMEOUT ]]; then
            log_error "Timeout awaiting encode ($elapsed s)"
            return 1
        fi
        
        local response
        response=$(curl -s "${API_URL}/api/movies/${MOVIE_ID}" \
            -H "X-Request-Id: ${REQUEST_ID}" \
            -H "Authorization: Bearer ${ADMIN_TOKEN}")
            
        local status=$(echo "$response" | jq -r '.data.encodeStatus // .encodeStatus // empty')
        
        if [[ "$status" == "ready" ]]; then
            log_success "Status: READY (${elapsed}s)"
            return 0
        elif [[ "$status" == "failed" ]]; then
            log_error "Status: FAILED"
            return 1
        else
            # pending or processing
            echo -n "."
            sleep 5
        fi
    done
}

generate_report() {
    log_step "Generating Report"
    
    local report_file="${ARTIFACTS_DIR}/video-smoke-report.json"
    
    # Create JSON report
    cat <<EOF > "$report_file"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "requestId": "$REQUEST_ID",
  "movieId": "$MOVIE_ID",
  "jobId": "$JOB_ID",
  "objectKey": "$OBJECT_KEY",
  "playbackUrl": "$PLAYBACK_URL",
  "status": "PASSED"
}
EOF
    
    log_info "Report saved to $report_file"
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------
main() {
    create_test_video
    login_admin
    create_movie
    get_presigned_url
    upload_video
    notify_upload_complete
    
    if wait_for_encoding; then
        get_stream_info
        verify_playback
        generate_report
        log_success "Smoke Test PASSED"
        exit 0
    else
        log_error "Smoke Test FAILED"
        echo "{\"requestId\": \"$REQUEST_ID\", \"status\": \"FAILED\"}" > "${ARTIFACTS_DIR}/video-smoke-report.json"
        exit 1
    fi
}

main "$@"
