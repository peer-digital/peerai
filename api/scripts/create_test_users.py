from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.auth import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_users():
    db = SessionLocal()
    try:
        # Create test users if they don't exist
        test_users = [
            {
                "email": "super.admin@peerai.se",
                "password": "testpass123",
                "full_name": "Super Admin",
                "is_superuser": True
            },
            {
                "email": "manager@peerai.se",
                "password": "testpass123",
                "full_name": "Test Manager",
                "is_superuser": False
            },
            {
                "email": "test@example.com",
                "password": "testpass123",
                "full_name": "Test User",
                "is_superuser": False
            }
        ]

        for user_data in test_users:
            if not db.query(User).filter(User.email == user_data["email"]).first():
                user = User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=pwd_context.hash(user_data["password"]),
                    is_active=True,
                    is_superuser=user_data["is_superuser"]
                )
                db.add(user)
                print(f"Created test user: {user_data['email']}")

        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users() 