# Google Cloud Development Environment Setup

## Issue: Database Connection Timeout After Computer Restart

When you restart your computer, you may encounter database connection timeouts when trying to access the Web-admin locally.

### Error Example
```
Authentication error: (psycopg2.OperationalError) connection to server at "34.63.69.188", port 5432 failed: timeout expired
```

## Root Cause
After restarting your computer, your public IP address may change, and it won't be in the Cloud SQL instance's authorized networks list.

## Solution Steps

### 1. Check Your Current Public IP
```bash
curl -s https://ipinfo.io/ip
```

### 2. Check Current Authorized Networks
```bash
gcloud sql instances describe torri-apps-db --project=linen-nebula-463915-q7 --format="value(settings.ipConfiguration.authorizedNetworks)"
```

### 3. Add Your New IP to Authorized Networks
```bash
gcloud sql instances patch torri-apps-db --authorized-networks=EXISTING_IP/32,YOUR_NEW_IP/32 --project=linen-nebula-463915-q7
```

**Example (replace with actual IPs):**
```bash
gcloud sql instances patch torri-apps-db --authorized-networks=177.149.132.41/32,179.73.184.66/32 --project=linen-nebula-463915-q7
```

### 4. Verify Google Cloud Authentication
Make sure you're authenticated and the correct project is set:
```bash
gcloud auth list
gcloud config get-value project
gcloud config set project linen-nebula-463915-q7
```

## Alternative: Using Cloud SQL Proxy (More Secure)

If you prefer not to expose your database to direct internet connections:

### 1. Install Cloud SQL Proxy
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
```

### 2. Authenticate with Google Cloud
```bash
gcloud auth application-default login
```

### 3. Start Cloud SQL Proxy
```bash
./cloud-sql-proxy linen-nebula-463915-q7:us-central1:torri-apps-db --port 5432 &
```

### 4. Update .env File
Change your database URL to use localhost:
```
DATABASE_URL=postgresql://torri_app:SecurePassword123!@127.0.0.1:5432/postgres
```

## Database Configuration

**Current Cloud SQL Instance:**
- Instance: `linen-nebula-463915-q7:us-central1:torri-apps-db`
- External IP: `34.63.69.188`
- Database: `postgres`
- User: `torri_app`
- Schemas: `dev` and `prod`

**Connection URLs:**
- Direct: `postgresql://torri_app:SecurePassword123!@34.63.69.188:5432/postgres`
- Via Proxy: `postgresql://torri_app:SecurePassword123!@127.0.0.1:5432/postgres`
- Cloud Run: `postgresql://torri_app:SecurePassword123!@/postgres?host=/cloudsql/linen-nebula-463915-q7:us-central1:torri-apps-db`