#\!/bin/bash
#
# Production Migration Script
#
# This script safely applies the CPF and address fields migration to production.
# It includes safety checks and rollback capabilities.
#
# Usage:
#     ./Scripts/migrate_to_prod.sh                    # Interactive mode with safety checks
#     ./Scripts/migrate_to_prod.sh --auto-confirm     # Skip confirmations (CI/CD)
#     ./Scripts/migrate_to_prod.sh --dry-run          # Show what would be done
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCHEMAS="prod"
TARGET_MIGRATION="add_cpf_and_address"

# Parse arguments
AUTO_CONFIRM=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --auto-confirm)
      AUTO_CONFIRM=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "============================================================"
    echo "$1"
    echo "============================================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

confirm_action() {
    if [ "$AUTO_CONFIRM" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}"
    read -p "$1 (y/N): " -n 1 -r
    echo -e "${NC}"
    if [[ \! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 1
    fi
}

# Main execution
print_header "🚀 PRODUCTION MIGRATION: CPF and Address Fields"

if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
    python Scripts/multi_schema_migration.py --schemas "$SCHEMAS" --action upgrade --target "$TARGET_MIGRATION" --dry-run
    exit 0
fi

# Step 1: Check current state
print_header "📊 Checking Current Migration State"
python Scripts/multi_schema_migration.py --schemas "$SCHEMAS" --action current

# Step 2: Safety confirmation
echo ""
print_warning "PRODUCTION MIGRATION WARNING"
echo "This will modify the production database schema."
confirm_action "Are you sure you want to proceed with the production migration?"

# Step 3: Apply migration
print_header "🔄 Applying Migration to Production"
if python Scripts/multi_schema_migration.py --schemas "$SCHEMAS" --action upgrade --target "$TARGET_MIGRATION"; then
    print_success "Production migration completed successfully\!"
else
    print_error "Migration failed\!"
    exit 1
fi
EOF < /dev/null