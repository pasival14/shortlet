from flask import Blueprint, request, jsonify, abort
from .models import User, db # Import User model
from . import db, bcrypt # Import db and bcrypt from __init__
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
import re # For basic email validation

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Basic email regex pattern
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

@auth_bp.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()

    # Basic Input Validation
    if not data:
        return jsonify({"message": "No input data provided"}), 400
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')

    if not all([email, password, first_name, last_name]):
        return jsonify({"message": "Missing required fields (email, password, first_name, last_name)"}), 400

    if not re.match(EMAIL_REGEX, email):
         return jsonify({"message": "Invalid email format"}), 400

    if len(password) < 6: # Example minimum password length
         return jsonify({"message": "Password must be at least 6 characters long"}), 400

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered"}), 409 # 409 Conflict

    # Create new user
    try:
        new_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name
            # user_type will default to 'guest' based on model definition
        )
        new_user.set_password(password) # Hash the password

        db.session.add(new_user)
        db.session.commit()

        # Exclude password hash from response
        user_data = {
            "id": new_user.id,
            "email": new_user.email,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "user_type": new_user.user_type
        }
        return jsonify({"message": "User registered successfully", "user": user_data}), 201 # 201 Created
    except Exception as e:
        db.session.rollback() # Rollback in case of error during commit
        print(f"Error during registration: {e}") # Log error
        return jsonify({"message": "Registration failed due to server error"}), 500


@auth_bp.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    # Check if user exists and password is correct
    if user and user.check_password(password):
        print(f"DEBUG: Creating token with identity: {user.id}, Type: {type(user.id)}")
        identity_str = str(user.id)
        # Create JWT tokens
        access_token = create_access_token(identity=identity_str)
        refresh_token = create_refresh_token(identity=identity_str)

        # Basic user info to return (exclude sensitive data)
        user_info = {
             "id": user.id,
             "email": user.email,
             "first_name": user.first_name,
             "last_name": user.last_name,
             "user_type": user.user_type
        }

        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_info
        }), 200
    else:
        # Generic error for security (don't reveal if email exists or password was wrong)
        return jsonify({"message": "Invalid credentials"}), 401 # 401 Unauthorized
    

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """ Gets the profile information for the currently logged-in user. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str) # Convert identity back to int
    except (ValueError, TypeError):
         abort(401, description="Invalid user identity in token.")

    user = User.query.get_or_404(current_user_id)
    return jsonify(user.to_dict())


@auth_bp.route('/profile', methods=['PATCH']) # PATCH is suitable for partial updates
@jwt_required()
def update_profile():
    """ Updates profile information for the currently logged-in user. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
         abort(401, description="Invalid user identity in token.")

    user = User.query.get_or_404(current_user_id)
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    # Update fields if they are provided in the request data
    # Add validation as needed (e.g., check lengths, formats)
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'profile_pic_url' in data: # Allow updating profile pic URL
        user.profile_pic_url = data['profile_pic_url']
        # Add validation for URL format if desired

    # Add more updatable fields here later (e.g., phone number if added to model)
    # IMPORTANT: Do NOT allow updating email or password directly here.
    # Email uniqueness needs careful handling, password change needs verification.

    try:
        db.session.commit()
        return jsonify({
            "message": "Profile updated successfully.",
            "user": user.to_dict() # Return updated user info
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating profile for user {current_user_id}: {e}")
        return jsonify({"message": "Failed to update profile due to server error"}), 500


# --- Refresh Token Route ---
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True) # Require a valid REFRESH token for this route
def refresh_access():
    """ Refreshes an expired access token using a valid refresh token. """
    current_user_id_str = get_jwt_identity() # Get identity from refresh token
    # Create a new access token (no need to re-verify password etc.)
    new_access_token = create_access_token(identity=current_user_id_str)
    return jsonify(access_token=new_access_token), 200

# --- Optional: Implement Logout/Blocklisting later ---
# A simple logout endpoint might just return success, relying on frontend to clear tokens.
# A more secure logout invalidates refresh tokens using a blocklist (more complex setup).
# @auth_bp.route('/logout', methods=['POST'])
# @jwt_required() # Could require access or refresh token depending on strategy
# def logout_user():
#     # Add token JTI (JWT ID) to blocklist here if implementing
#     return jsonify({"message": "Logout successful (token cleared client-side)"}), 200

# Add /refresh and /logout routes later if needed