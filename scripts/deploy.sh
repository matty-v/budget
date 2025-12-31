#!/bin/bash
set -e

BUCKET_NAME="voget-budget-app"
PROJECT_ID="${GCP_PROJECT_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Budget App Deployment ===${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}Error: Not logged in to gcloud${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi

# Get project ID if not set
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    echo "Or set GCP_PROJECT_ID environment variable"
    exit 1
fi

echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Bucket: gs://${BUCKET_NAME}${NC}"

# Build the app
echo -e "\n${GREEN}Building app...${NC}"
npm run build

# Check if bucket exists, create if not
if ! gsutil ls -b "gs://${BUCKET_NAME}" &> /dev/null; then
    echo -e "\n${GREEN}Creating bucket gs://${BUCKET_NAME}...${NC}"
    gsutil mb -p "$PROJECT_ID" -l us-central1 "gs://${BUCKET_NAME}"

    # Make bucket publicly readable
    echo -e "${GREEN}Setting public access...${NC}"
    gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"
fi

# Always ensure website configuration is set (serves index.html for 404s - needed for SPA routing)
echo -e "${GREEN}Configuring bucket for SPA routing...${NC}"
gsutil web set -m index.html -e index.html "gs://${BUCKET_NAME}"

# Upload files with appropriate cache headers
echo -e "\n${GREEN}Uploading files...${NC}"

# Upload hashed assets with long cache (1 year)
# Vite outputs hashed files to assets/ directory
echo -e "${YELLOW}Uploading hashed assets (1 year cache)...${NC}"
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
    cp -r dist/assets "gs://${BUCKET_NAME}/"

# Upload other static files (icons, manifest, etc.) with moderate cache (1 day)
echo -e "${YELLOW}Uploading static files (1 day cache)...${NC}"
for file in dist/*.png dist/*.svg dist/*.ico dist/manifest.json dist/sw.js; do
    if [ -f "$file" ] 2>/dev/null; then
        gsutil -h "Cache-Control:public, max-age=86400" \
            cp "$file" "gs://${BUCKET_NAME}/"
    fi
done

# Upload icons directory if it exists
if [ -d "dist/icons" ]; then
    gsutil -m -h "Cache-Control:public, max-age=86400" \
        cp -r dist/icons "gs://${BUCKET_NAME}/"
fi

# Upload index.html with no-cache (always fetch fresh for cache busting)
echo -e "${YELLOW}Uploading index.html (no cache)...${NC}"
gsutil -h "Cache-Control:no-cache, no-store, must-revalidate" \
    cp dist/index.html "gs://${BUCKET_NAME}/"

# Print success message and URL
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Bucket URL: https://storage.googleapis.com/${BUCKET_NAME}/index.html"
echo -e "Website URL: https://${BUCKET_NAME}.storage.googleapis.com/"
echo -e "\nFor custom domain with CDN, set up Cloud CDN with a load balancer."
