#!/usr/bin/env bash
# ==============================================================================
# scripts/ci/smoke.sh - P0 Smoke Gate: Infrastructure & Service Health
# ==============================================================================
set -euo pipefail
# PASS when:
#   - Docker compose services are healthy (postgres, redis, minio)
#   - API health endpoint returns HTTP 200
#   - Admin/Web can be reached (if running)
#
# FAIL when:
#   - Any service not healthy within timeout
#   - Any HTTP check fails
#
# Usage:
#   ./scripts/ci/smoke.sh
#   pnpm -w smoke
#
# Environment Variables:
#   SMOKE_TIMEOUT      - Timeout for health checks (default: 120s)
#   API_URL            - API base URL (default: http://localhost:3000)
#   ADMIN_URL          - Admin panel URL (default: http://localhost:3001)
#   SKIP_COMPOSE_UP    - Skip docker compose up (default: false)
# ==============================================================================

# Load helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

trap cleanup EXIT

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-120}"
API_URL="${API_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3001}"
SKIP_COMPOSE_UP="${SKIP_COMPOSE_UP:-false}"

# Core infrastructure services
INFRA_SERVICES=(postgres redis minio)

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

check_docker_available() {
    if ! command -v docker &> /dev/null; then
        fail "Docker is not installed or not in PATH"
    fi
    
    if ! docker info &> /dev/null; then
        fail "Docker daemon is not running"
    fi
}

start_infrastructure() {
    if [[ "$SKIP_COMPOSE_UP" == "true" ]]; then
        log_info "Skipping docker compose up (SKIP_COMPOSE_UP=true)"
        return 0
    fi
    
    log_step "Starting Infrastructure"
    
    if ! docker compose up -d; then
        fail "Failed to start docker compose services"
    fi
    
    log_success "Docker compose services started"
}

check_service_health() {
    log_step "Checking Service Health"
    
    local start_time
    start_time=$(date +%s)
    
    for service in "${INFRA_SERVICES[@]}"; do
        log_info "Checking $service..."
        
        local timeout_remaining=$SMOKE_TIMEOUT
        while [[ $timeout_remaining -gt 0 ]]; do
            # Get container health status
            local health
            health=$(docker inspect --format='{{.State.Health.Status}}' "NETFLAT-$service" 2>/dev/null || echo "not_found")
            
            case "$health" in
                "healthy")
                    log_success "$service is healthy"
                    break
                    ;;
                "not_found")
                    # Try alternative container name format
                    health=$(docker compose ps --format json "$service" 2>/dev/null | jq -r '.Health // "starting"' 2>/dev/null || echo "starting")
                    if [[ "$health" == "healthy" ]]; then
                        log_success "$service is healthy"
                        break
                    fi
                    ;;
                "unhealthy")
                    log_error "$service is unhealthy"
                    docker logs "NETFLAT-$service" --tail 50 2>&1 || true
                    fail "Service $service failed health check"
                    ;;
            esac
            
            echo -n "."
            sleep 2
            timeout_remaining=$((timeout_remaining - 2))
        done
        
        if [[ $timeout_remaining -le 0 ]]; then
            log_error "$service did not become healthy within ${SMOKE_TIMEOUT}s"
            docker compose ps
            docker logs "NETFLAT-$service" --tail 100 2>&1 || true
            fail "Timeout waiting for $service"
        fi
    done
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "All infrastructure services healthy in ${duration}s"
}

check_api_health() {
    log_step "Checking API Health"
    
    local health_url="${API_URL}/health"
    
    if wait_for_url "$health_url" "$SMOKE_TIMEOUT"; then
        # Get detailed health info
        local response
        response=$(curl -s "$health_url" 2>/dev/null || echo "{}")
        log_info "API Health Response: $response"
        log_success "API is healthy"
        return 0
    else
        log_error "API health check failed"
        log_error "URL: $health_url"
        return 1
    fi
}

check_admin_reachable() {
    log_step "Checking Admin Panel (Optional)"
    
    # Admin check is optional - it may not be running in CI
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_URL" 2>/dev/null || echo "000")
    
    if [[ "$status" =~ ^[23][0-9][0-9]$ ]]; then
        log_success "Admin panel is reachable (HTTP $status)"
        return 0
    else
        log_warn "Admin panel not reachable (HTTP $status) - this is OK if not running"
        return 0  # Don't fail on optional check
    fi
}

show_service_status() {
    log_step "Service Status Summary"
    docker compose ps
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------
main() {
    log_step "SMOKE GATE - Infrastructure & Service Health"
    log_info "Timeout: ${SMOKE_TIMEOUT}s"
    log_info "API URL: ${API_URL}"
    
    local start_time
    start_time=$(date +%s)
    local failed=0
    
    # Pre-flight checks
    check_docker_available
    
    # Start infrastructure
    start_infrastructure
    
    # Wait a moment for services to initialize
    sleep 5
    
    # Check infrastructure health
    if ! check_service_health; then
        failed=1
    fi
    
    # Check API health
    if ! check_api_health; then
        failed=1
    fi
    
    # Check Admin (optional)
    check_admin_reachable
    
    # Show status
    show_service_status
    
    # Summary
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_step "SMOKE GATE SUMMARY"
    
    if [[ $failed -eq 0 ]]; then
        log_success "✅ SMOKE GATE PASSED in ${duration}s"
        log_info "Infrastructure: postgres, redis, minio - healthy"
        log_info "API: ${API_URL}/health - reachable"
        exit 0
    else
        log_error "❌ SMOKE GATE FAILED in ${duration}s"
        log_error "Check logs above for details"
        exit 1
    fi
}

main "$@"
