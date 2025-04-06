# Database Migrations with Alembic

This directory contains database migration scripts managed by Alembic.

## Overview

Alembic is used to manage database schema changes in a version-controlled way. The migrations are stored in the `versions/` directory and are applied in sequence to bring the database schema up to date.

## Important Files

- `env.py`: Configuration for the Alembic environment
- `script.py.mako`: Template for generating new migration scripts
- `versions/`: Directory containing all migration scripts

## Running Migrations

For convenience, we provide scripts to help you run migrations:

```bash
# Using the shell script (recommended)
./backend/scripts/sync_db.sh

# Or using the Python script directly
python -m backend.scripts.sync_database
```

Alternatively, you can use Alembic commands directly:

```bash
# Apply all migrations
alembic upgrade head

# Apply specific migration
alembic upgrade <revision>

# Downgrade to a specific migration
alembic downgrade <revision>

# Show current migration version
alembic current

# Show migration history
alembic history
```

## Creating New Migrations

If you've made changes to the database models, you need to create a new migration:

```bash
# Generate a new migration automatically based on model changes
alembic revision --autogenerate -m "description_of_changes"

# Create a blank migration
alembic revision -m "description_of_changes"
```

## Migration Naming Convention

When creating migrations, use descriptive names that clearly indicate what changes are being made:

- `add_table_name`: For adding new tables
- `alter_table_name`: For modifying existing tables
- `remove_table_name`: For removing tables
- `add_column_to_table`: For adding columns
- `rename_column_in_table`: For renaming columns
- `create_index_on_table`: For adding indexes

## Troubleshooting

### Missing Tables

If you encounter errors about missing tables when running migrations, you may need to stamp the current version:

```bash
alembic stamp head
```

### Conflicting Migrations

If you have conflicting migrations (multiple heads), you need to create a merge migration:

```bash
alembic merge heads -m "merge_migrations"
```

### Database Connection Issues

Make sure your `DATABASE_URL` environment variable is set correctly. You can check the connection using:

```bash
python -c "from sqlalchemy import create_engine; import os; engine = create_engine(os.getenv('DATABASE_URL')); conn = engine.connect(); print('Connection successful!')"
```

## Best Practices

1. Always test migrations on a development database before applying to production
2. Include both upgrade and downgrade operations in your migrations
3. Keep migrations small and focused on specific changes
4. Use data migrations sparingly and carefully
5. Always back up your database before applying migrations in production
