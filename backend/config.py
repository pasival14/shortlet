import os
from dotenv import load_dotenv
from datetime import timedelta

# Get the absolute path of the directory where config.py resides (which is the 'backend' directory)
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env')) # Also make sure .env is loaded correctly

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess-this-dev-key'

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

    # --- MODIFIED LINE ---
    # Force the SQLite path to be absolute, directly inside the 'backend' folder
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app_main.db')
    # --- END MODIFIED LINE ---

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY')
    # PAYSTACK_PUBLIC_KEY = os.environ.get('PAYSTACK_PUBLIC_KEY') # Load public if needed globally, often just frontend uses it

    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)