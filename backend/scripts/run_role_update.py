#!/usr/bin/env python
"""
Script to execute the SQL script to update the role enum and user roles.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings

def run_role_update():
    """Execute the SQL script to update the role enum and user roles."""
    # Get database connection parameters from settings
    db_url = settings.DATABASE_URL
    
    # Parse the database URL to get connection parameters
    # Format: postgresql://username:password@host:port/dbname
    if db_url.startswith('postgresql://'):
        db_url = db_url[len('postgresql://'):]
    
    # Split username:password@host:port/dbname
    auth_host_db = db_url.split('@')
    if len(auth_host_db) == 2:
        auth, host_db = auth_host_db
        if ':' in auth:
            db_user, db_password = auth.split(':')
        else:
            db_user, db_password = auth, None
    else:
        db_user, db_password = None, None
        host_db = db_url
    
    # Split host:port/dbname
    host_port_db = host_db.split('/')
    if len(host_port_db) == 2:
        host_port, db_name = host_port_db
        if ':' in host_port:
            db_host, db_port = host_port.split(':')
        else:
            db_host, db_port = host_port, '5432'
    else:
        db_host, db_port, db_name = 'localhost', '5432', host_db
    
    print(f"Connecting to database {db_name} on {db_host}:{db_port} as {db_user}")
    
    try:
        # Connect to the database
        conn_params = {
            'host': db_host,
            'port': db_port,
            'dbname': db_name,
            'user': db_user
        }
        if db_password:
            conn_params['password'] = db_password
        
        conn = psycopg2.connect(**conn_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        # Create a cursor
        cursor = conn.cursor()
        
        # Read the SQL script
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'update_role_enum.sql')
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        # Execute the SQL script
        print("Executing SQL script...")
        cursor.execute(sql_script)
        
        # Fetch and print the results of the verification query
        rows = cursor.fetchall()
        print("\nRole distribution after update:")
        for role, count in rows:
            print(f"  {role}: {count} users")
        
        # Close the cursor and connection
        cursor.close()
        conn.close()
        
        print("\nRole update completed successfully.")
        
    except Exception as e:
        print(f"Error updating roles: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_role_update()
