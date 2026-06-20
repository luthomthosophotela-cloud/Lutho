# Local Development Setup

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies

```bash
npm install drizzle-orm drizzle-kit pg
# or
yarn add drizzle-orm drizzle-kit pg
```

### 2. Create Local PostgreSQL Database

```bash
# macOS (if using homebrew)
brew services start postgresql

# Create database
createdb marketplace_db

# Optional: Create a user
psql -U postgres -c "CREATE USER marketplace WITH PASSWORD 'password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE marketplace_db TO marketplace;"
```

### 3. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your database credentials
# Example:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace_db
```

### 4. Generate and Push Schema

```bash
# Generate migrations
npm run drizzle:generate -- --name init

# Push schema directly to database (for local development)
npm run drizzle:push
```

## Available Commands

Add these to your `package.json` scripts:

```json
"scripts": {
  "drizzle:generate": "drizzle-kit generate:pg",
  "drizzle:push": "drizzle-kit push:pg",
  "drizzle:studio": "drizzle-kit studio"
}
```

Then run:

```bash
# Start Drizzle Studio (visual database explorer)
npm run drizzle:studio
```

## Database Schema Overview

The schema includes:

- **Users** - Authentication, profiles, OAuth integration
- **Listings** - Product/service listings with full-text search
- **Orders** - Purchase transactions
- **Payments** - Stripe payment tracking
- **Reviews** - User ratings and feedback
- **Messages** - Order-related messaging
- **Notifications** - User alerts
- **Categories** - Hierarchical category structure

## Troubleshooting

### Connection Refused

```bash
# Verify PostgreSQL is running
psql --version
psql -U postgres -c "SELECT 1"
```

### Database Already Exists

```bash
# Drop and recreate
dropdb marketplace_db
createdb marketplace_db
```

### Permission Denied

```bash
# Reset user permissions
psql -U postgres -c "ALTER DATABASE marketplace_db OWNER TO postgres;"
```
