#!/bin/bash
# SILKinCOM — Database setup script
# Usage: ./scripts/setup-db.sh

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Export it first."
  echo "   export DATABASE_URL='postgresql://user:pass@host:port/db'"
  exit 1
fi

echo "🔧 Setting up SILKinCOM database..."

echo "📋 1/5 Creating schema..."
psql "$DATABASE_URL" -f database/schema.sql

echo "🔍 2/5 Creating indexes..."
psql "$DATABASE_URL" -f database/indexes.sql

echo "⚙️  3/5 Creating triggers..."
psql "$DATABASE_URL" -f database/triggers.sql

echo "🔒 4/5 Applying RLS policies..."
psql "$DATABASE_URL" -f database/rls-policies.sql

echo "🌱 5/5 Seeding demo data..."
psql "$DATABASE_URL" -f database/seed.sql

echo "✅ Database setup complete!"
