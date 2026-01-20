import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.core.database import engine
from sqlmodel import Session, text
from sqlalchemy.exc import OperationalError

def test_connection():
    print("Testing database connection...")
    try:
        with Session(engine) as session:
            result = session.exec(text("SELECT 1")).first()
            if result == 1:
                print("✅ Connection successful!")
                return True
            else:
                print("❌ Connection successful but returned unexpected result.")
                return False
    except OperationalError as e:
        print(f"❌ Connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    if test_connection():
        sys.exit(0)
    else:
        sys.exit(1)
