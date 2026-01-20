import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.core.database import init_db
from app.models import User, Transaction # Ensure models are imported so SQLModel finds them

if __name__ == "__main__":
    print("Initializing database...")
    try:
        init_db()
        print("✅ Database initialized successfully (Tables created).")
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        sys.exit(1)
