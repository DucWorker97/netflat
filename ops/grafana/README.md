# NETFLAT Observability

This directory contains Grafana dashboards and configuration for monitoring the NETFLAT pipeline.

## Dashboards

### Pipeline Trace (`NETFLAT-pipeline.json`)
Correlate API and Worker logs using `requestId`.

**Requirements:**
- Loki datasource (or generic logs datasource with JSON parsing support)
- Logs must be JSON formatted
- Common labels: `service` ("api" | "worker"), `env`

**Standard Log Fields:**
- `requestId`: Correlation ID
- `jobId`: BullMQ Job ID
- `movieId`: Domain ID
- `event`: Event name (e.g. `ENCODE_STARTED`)

**Sample LogQL Queries:**
- **Trace a Request:** `{env="development"} | json | requestId="$requestId"`
- **Failed Jobs:** `{service="worker"} | json | event="ENCODE_FAILED"`
- **Slow Encodes:** `{service="worker"} | json | event="ENCODE_READY" | durationMs > 60000`

## Importing
1. Login to Grafana
2. Dashboards > New > Import
3. Upload `dashboards/NETFLAT-pipeline.json`
4. Select your Loki datasource
