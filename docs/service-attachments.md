# Service Attachment operations

Service Attachments are private objects in an S3-compatible store. PostgreSQL owns attachment identity and metadata plus the durable cleanup outbox. The API accepts one signature-verified PDF, JPEG, or PNG up to 10 MiB per request and never returns object keys or provider details. JPEG and PNG metadata includes a stable application `previewUrl`; PDF metadata includes `previewUrl: null`.

## Storage configuration

Local Docker development uses the private `gofunio-attachments-local` MinIO bucket:

```bash
docker compose up -d minio minio-init
```

Runtime storage configuration is provider-neutral:

```text
ATTACHMENT_STORAGE_DRIVER=s3
ATTACHMENT_STORAGE_ENDPOINT=http://minio:9000
ATTACHMENT_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000
ATTACHMENT_STORAGE_REGION=us-east-1
ATTACHMENT_STORAGE_BUCKET=gofunio-attachments-local
ATTACHMENT_STORAGE_ACCESS_KEY_ID=...
ATTACHMENT_STORAGE_SECRET_ACCESS_KEY=...
ATTACHMENT_STORAGE_FORCE_PATH_STYLE=true
```

Use separate private buckets and bucket-scoped credentials for staging and production. Keep public access disabled. `ATTACHMENT_STORAGE_PUBLIC_ENDPOINT` is the endpoint signed into short-lived read URLs and must be reachable by the frontend; never rewrite a URL after signing.

## Private reads and image previews

Both read endpoints require a session and authorize the active Workspace, Service, and Vehicle Access before storage is contacted:

```text
GET /services/:serviceId/attachments/:attachmentId
GET /services/:serviceId/attachments/:attachmentId/preview
```

Download returns `302` to a presigned URL valid for 300 seconds with `Content-Disposition: attachment`. Preview supports only JPEG and PNG and returns `302` with `Content-Disposition: inline`; its redirect response uses `Cache-Control: private, no-store`. An authorized PDF preview request returns `415` with the stable code `ATTACHMENT_PREVIEW_NOT_AVAILABLE`. Authorization runs before the MIME-type check, so inaccessible attachments remain masked by the normal access response.

`previewUrl` always points to the application preview endpoint, never to an object key, bucket URL, or final presigned URL. Entering that stable path performs authorization again and creates a fresh short-lived URL.

## Cleanup and reconciliation

The cleanup worker runs at backend bootstrap and approximately every minute. It retries failed deletion jobs with recoverable leases.

Compare stored objects with active Attachments and unfinished cleanup jobs:

```bash
# Safe default: reports old orphaned objects without mutation
pnpm --filter backend attachments:reconcile

# Explicitly delete orphaned objects at least 24 hours old
pnpm --filter backend attachments:reconcile -- --delete
```

The command prints deterministic JSON counts and exits non-zero on database or provider failure. Review the dry-run output before using `--delete`.

Validate the S3-compatible storage contract against local MinIO:

```bash
pnpm --filter backend test:storage
```

Normal unit/e2e CI uses memory-backed attachment storage and requires neither MinIO nor Cloudflare credentials.
