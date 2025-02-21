"""
Mock database module for testing
"""

def get_db():
    """Get database session"""
    try:
        yield None
    finally:
        pass 