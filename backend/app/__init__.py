from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from config import Config
from flask_jwt_extended import JWTManager
import cloudinary

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
bcrypt = Bcrypt()
jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --- Initialize Cloudinary ---
    if app.config.get('CLOUDINARY_CLOUD_NAME'): # Only configure if keys are set
        cloudinary.config(
            cloud_name = app.config['CLOUDINARY_CLOUD_NAME'],
            api_key = app.config['CLOUDINARY_API_KEY'],
            api_secret = app.config['CLOUDINARY_API_SECRET'],
            secure=True # Use HTTPS
        )
        print("Cloudinary configured.")
    else:
        print("Cloudinary credentials not found in config.")

    db.init_app(app)
    migrate.init_app(app, db)
    # Allow all origins for API routes for now (adjust in production)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    bcrypt.init_app(app)
    jwt.init_app(app)

    # --- Register Blueprints ---
    from .routes import api_bp
    app.register_blueprint(api_bp)

    from .auth_routes import auth_bp # Import the auth blueprint
    app.register_blueprint(auth_bp) # Register it


    from . import models

    return app