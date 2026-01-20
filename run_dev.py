import subprocess
import sys
import os

def run_dev():
    print("🚀 Starting Kpege 2.0 Backend...")
    print("--------------------------------")
    print("1. Local Server: http://localhost:8000")
    print("2. Documentation: http://localhost:8000/docs")
    print("3. Webhook URL: (Use ngrok to get this)")
    print("--------------------------------")
    print("\nTo start ngrok in a separate terminal:")
    print("   ngrok http 8000")
    print("\n--------------------------------\n")
    
    os.chdir("kpege-next/backend")
    try:
        subprocess.run(["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], check=True)
    except KeyboardInterrupt:
        print("\nStopping server...")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    run_dev()
