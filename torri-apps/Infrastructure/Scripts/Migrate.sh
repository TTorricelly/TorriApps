#!/bin/bash

# Database migration script
echo "Running database migrations..."

cd Backend
python -m alembic upgrade head

echo "Migrations completed successfully!"

