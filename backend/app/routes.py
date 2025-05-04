import cloudinary
import cloudinary.uploader
from flask import Blueprint, jsonify, abort, request
from .models import Property, Booking, User, Review # Import your Property model
from . import db # Import the db instance if needed for complex queries, though not strictly necessary here
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date # Import datetime, date
import requests # Add requests
from flask import current_app # To access config variables
import time # For unique reference timestamp
import hmac # For signature verification
import hashlib # For signature verification
import json # For parsing raw body
from sqlalchemy import Text
from sqlalchemy import and_


# Create a Blueprint for API routes
# The first argument is the blueprint's name, the second is its import name
api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Property Routes ---

@api_bp.route('/properties', methods=['GET'])
def get_properties():
    """
    Gets a list of properties, optionally filtered by query parameters, including date availability.
    """
    try:
        query = Property.query

        # --- Apply Text/Numeric Filters (as before) ---
        city = request.args.get('city')
        state = request.args.get('state')
        # ... (min_price, max_price, min_bedrooms, min_guests filtering logic - keep as is) ...
        if city:
            query = query.filter(Property.city.ilike(f'%{city}%'))
        if state:
            query = query.filter(Property.state.ilike(f'%{state}%'))
        # ... (handle numeric filters with try-except block) ...
        try:
            min_price_str = request.args.get('min_price')
            max_price_str = request.args.get('max_price')
            min_bedrooms_str = request.args.get('min_bedrooms')
            min_guests_str = request.args.get('min_guests')

            if min_price_str:
                min_price = float(min_price_str)
                if min_price >= 0: query = query.filter(Property.price_per_night >= min_price)
            if max_price_str:
                max_price = float(max_price_str)
                if max_price >= 0: query = query.filter(Property.price_per_night <= max_price)
            if min_bedrooms_str:
                min_bedrooms = int(min_bedrooms_str)
                if min_bedrooms > 0: query = query.filter(Property.num_bedrooms >= min_bedrooms)
            if min_guests_str:
                min_guests = int(min_guests_str)
                if min_guests > 0: query = query.filter(Property.max_guests >= min_guests)
        except (ValueError, TypeError):
             print(f"Warning: Invalid numeric filter parameter received.")
             # Decide: ignore or abort(400)


        # --- NEW: Apply Date Availability Filter ---
        check_in_str = request.args.get('check_in') # Use 'check_in' and 'check_out'
        check_out_str = request.args.get('check_out')

        if check_in_str and check_out_str:
            try:
                # Parse dates
                requested_checkin = datetime.strptime(check_in_str, '%Y-%m-%d').date()
                requested_checkout = datetime.strptime(check_out_str, '%Y-%m-%d').date()

                if requested_checkout <= requested_checkin:
                     raise ValueError("Check-out date must be after check-in date.")

                # Find property IDs that have a CONFLICTING confirmed booking
                # Overlap: (ExistingStart < RequestedEnd) AND (ExistingEnd > RequestedStart)
                conflicting_prop_ids_subquery = db.session.query(Booking.property_id).filter(
                    Booking.status == 'confirmed',
                    Booking.check_in_date < requested_checkout,
                    Booking.check_out_date > requested_checkin
                ).distinct().subquery() # Get distinct property IDs with conflicts

                # Filter out properties whose IDs are in the subquery result
                query = query.filter(Property.id.notin_(
                    db.select(conflicting_prop_ids_subquery.c.property_id)
                ))

            except ValueError as e:
                print(f"Warning: Invalid date format or range: {e}")
                # Optionally abort(400, description=f"Invalid date format or range: {e}")
            except Exception as e:
                 print(f"Error during date filtering: {e}") # Log other potential errors


        # --- Execute Query ---
        properties = query.order_by(Property.created_at.desc()).all()
        properties_list = [prop.to_dict() for prop in properties]
        return jsonify(properties_list)

    except Exception as e:
        # ... (existing error handling) ...
        print(f"Error fetching properties: {e}")
        import traceback
        traceback.print_exc()
        abort(500, description="Internal Server Error")


@api_bp.route('/properties/<int:property_id>', methods=['GET'])
def get_property(property_id):
    """
    Gets details for a single property by its ID.
    """
    try:
        # .get_or_404() is convenient: fetches by primary key or aborts with 404 Not Found
        property_item = Property.query.get_or_404(property_id)
        return jsonify(property_item.to_dict())
    except Exception as e:
        # Log the error e
        print(f"Error fetching property {property_id}: {e}")
        # We might already be aborting with 404 from get_or_404,
        # but catch other potential errors.
        if hasattr(e, 'code') and e.code == 404:
             abort(404, description="Property not found")
        else:
             abort(500, description="Internal Server Error")


@api_bp.route('/properties', methods=['POST'])
@jwt_required()
def create_property():
    """ Creates a new property listing, handling image uploads. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
        abort(401, description="Invalid user identity in token.")

    # --- IMPORTANT: Get data from request.form and request.files ---
    data = request.form # Text fields come from form data now
    files = request.files.getlist('listing_photos') # Use getlist for multiple files with same name

    # --- Validation for form data ---
    required_fields = ['title', 'address', 'city', 'state', 'price_per_night', 'max_guests', 'num_bedrooms', 'num_bathrooms']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"message": f"Missing required form fields: {', '.join(missing_fields)}"}), 400

    # Validate numeric types from form data (which are strings)
    try:
        price = float(data['price_per_night'])
        max_guests = int(data['max_guests'])
        num_bedrooms = int(data['num_bedrooms'])
        num_bathrooms = float(data['num_bathrooms']) # Allow float here
        if price <= 0 or max_guests <= 0 or num_bedrooms < 0 or num_bathrooms < 0: # Allow 0 beds/baths? Adjust as needed
             raise ValueError("Numeric fields must be positive (or zero).")
    except (ValueError, TypeError, KeyError) as e:
        # KeyError added in case field exists but conversion fails
        print(f"Data conversion error: {e}")
        return jsonify({"message": "Invalid data type or value for numeric fields (price, guests, bedrooms, bathrooms)."}), 400

    # --- Image Uploading to Cloudinary ---
    image_urls = []
    if not files or len(files) == 0 or files[0].filename == '':
         # Handle case where no files are uploaded, maybe make it required?
         # return jsonify({"message": "At least one image is required for listing_photos"}), 400
         print("No image files provided for listing_photos.")
         # Allow creation without photos for now, adjust if photos are mandatory
    else:
        print(f"Received {len(files)} files for upload.")
        # Define allowed extensions (example)
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

        def allowed_file(filename):
            return '.' in filename and \
                   filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

        for file in files:
            if file and allowed_file(file.filename):
                try:
                    # Upload to Cloudinary, optionally specify a folder
                    upload_result = cloudinary.uploader.upload(
                        file,
                        folder="shortlet_listings" # Optional: organize uploads in Cloudinary
                        # You can add transformations here too if needed
                    )
                    image_urls.append(upload_result['secure_url']) # Get the HTTPS URL
                    print(f"Uploaded {file.filename} to {upload_result['secure_url']}")
                except Exception as e:
                    print(f"Cloudinary upload error for {file.filename}: {e}")
                    # Decide: fail entire request or just skip this file?
                    # Let's fail for now if any upload fails.
                    return jsonify({"message": f"Image upload failed for {file.filename}: {e}"}), 500
            elif file and file.filename != '':
                 print(f"Skipped file with invalid type: {file.filename}")
                 # Optionally return an error for invalid file types
                 # return jsonify({"message": f"Invalid file type: {file.filename}. Allowed: {ALLOWED_EXTENSIONS}"}), 400


    # --- Create Property in DB ---
    try:
        # Get amenities - assuming sent as comma-separated string in form data
        amenities_str = data.get('amenities', '')
        amenities_list = [a.strip() for a in amenities_str.split(',') if a.strip()]

        new_property = Property(
            host_id=current_user_id,
            title=data['title'],
            description=data.get('description', ''),
            address=data['address'],
            city=data['city'],
            state=data['state'],
            price_per_night=price,
            max_guests=max_guests,
            num_bedrooms=num_bedrooms,
            num_bathrooms=num_bathrooms,
            amenities=amenities_list, # Store parsed list
            power_backup_details=data.get('power_backup_details', 'None'),
            latitude=float(data['latitude']) if data.get('latitude') else None, # Convert optional lat/lon
            longitude=float(data['longitude']) if data.get('longitude') else None,
            listing_photos=image_urls # Store the Cloudinary URLs
        )

        db.session.add(new_property)
        db.session.commit()

        return jsonify({
            "message": "Property created successfully",
            "property": new_property.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating property in DB: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to save property due to server error"}), 500
    

@api_bp.route('/properties/<int:property_id>/bookings', methods=['POST'])
@jwt_required()
def create_booking(property_id):
    """ Creates a new booking request for a specific property. """
    current_user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data provided"}), 400

    # --- Get Data & Validate ---
    check_in_str = data.get('check_in_date')
    check_out_str = data.get('check_out_date')
    num_guests_str = data.get('num_guests')

    if not all([check_in_str, check_out_str, num_guests_str]):
        return jsonify({"message": "Missing required fields (check_in_date, check_out_date, num_guests)"}), 400

    try:
        # Convert dates carefully (assuming YYYY-MM-DD format from frontend)
        check_in_date = datetime.strptime(check_in_str, '%Y-%m-%d').date()
        check_out_date = datetime.strptime(check_out_str, '%Y-%m-%d').date()
        num_guests = int(num_guests_str)

        if check_in_date < date.today():
             return jsonify({"message": "Check-in date cannot be in the past"}), 400
        if check_out_date <= check_in_date:
            return jsonify({"message": "Check-out date must be after check-in date"}), 400
        if num_guests <= 0:
            return jsonify({"message": "Number of guests must be positive"}), 400
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid data format for dates (use YYYY-MM-DD) or number of guests."}), 400

    # --- Check Property and Guest Capacity ---
    property_item = Property.query.get_or_404(property_id) # 404 if property not found
    if num_guests > property_item.max_guests:
        return jsonify({"message": f"Number of guests ({num_guests}) exceeds property capacity ({property_item.max_guests})"}), 400

    # --- Check for Booking Conflicts ---
    # Find existing bookings for this property that overlap with the requested dates
    # Overlap condition: (ExistingStart < RequestedEnd) AND (ExistingEnd > RequestedStart)
    # We check against bookings that are NOT cancelled. Status could be 'pending' or 'confirmed'.
    conflicting_bookings = Booking.query.filter(
        Booking.property_id == property_id,
        # Booking.status != 'cancelled', # OLD - Checked pending & confirmed
        Booking.status == 'confirmed', # NEW - Only check against confirmed bookings
        Booking.check_in_date < check_out_date,
        Booking.check_out_date > check_in_date
    ).first()

    if conflicting_bookings:
        return jsonify({"message": "Requested dates conflict with an existing booking for this property"}), 409 # 409 Conflict

    # --- Calculate Price ---
    num_nights = (check_out_date - check_in_date).days
    total_price = num_nights * property_item.price_per_night

    # --- Create Booking ---
    try:
        new_booking = Booking(
            guest_id=current_user_id,
            property_id=property_id,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            num_guests=num_guests,
            total_price=total_price,
            status='pending', # Default status
            payment_status='unpaid' # Default status
        )
        db.session.add(new_booking)
        db.session.commit()

        return jsonify({
            "message": "Booking request created successfully. Awaiting confirmation/payment.",
            "booking": new_booking.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating booking: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to create booking due to server error"}), 500


# --- NEW: View My Bookings Route (Guest) ---
@api_bp.route('/my-bookings', methods=['GET'])
@jwt_required()
def get_my_bookings():
    """ Gets bookings made by the current logged-in user. """
    current_user_id = get_jwt_identity()
    try:
        bookings = Booking.query.filter_by(guest_id=current_user_id).order_by(Booking.check_in_date.desc()).all()
        # Include basic property info with each booking
        bookings_list = [b.to_dict(include_property=True) for b in bookings]
        return jsonify(bookings_list)
    except Exception as e:
        print(f"Error fetching user bookings: {e}")
        abort(500, description="Internal Server Error")


# --- NEW: View Host Bookings Route (Host) ---
@api_bp.route('/host/bookings', methods=['GET'])
@jwt_required()
def get_host_bookings():
    """ Gets bookings for properties hosted by the current user. """
    current_user_id = get_jwt_identity()

    # Optional: Check if user is actually a host (add this later if needed)
    # current_user = User.query.get(current_user_id)
    # if not current_user or current_user.user_type != 'host':
    #     return jsonify({"message": "Access forbidden: User is not a host"}), 403

    try:
        bookings = Booking.query.join(Property).filter(Property.host_id == current_user_id).order_by(Booking.check_in_date.desc()).all()
        bookings_list = [b.to_dict(include_guest=True) for b in bookings]
        return jsonify(bookings_list)
    except Exception as e:
        print(f"Error fetching host bookings: {e}")
        import traceback
        traceback.print_exc()
        abort(500, description="Internal Server Error")


@api_bp.route('/host/bookings/<int:booking_id>/confirm', methods=['PATCH'])
@jwt_required()
def confirm_booking(booking_id):
    """ Confirms a pending booking for one of the host's properties. """
    current_user_id_str = get_jwt_identity()
    try:
        booking = Booking.query.get_or_404(booking_id)
        property_item = Property.query.get(booking.property_id) # Get associated property

        try:
            current_user_id = int(current_user_id_str)
        except (ValueError, TypeError):
             print(f"ERROR: Invalid JWT identity format: {current_user_id_str}")
             abort(401) # Unauthorized - bad token identity format

        # Authorization: Ensure current user owns the property associated with the booking
        if not property_item or property_item.host_id != current_user_id:
            abort(403, description="Forbidden: You do not own the property for this booking.") # 403 Forbidden

        # Check if booking is in a confirmable state
        if booking.status != 'pending':
            return jsonify({"message": f"Booking is already {booking.status}, cannot confirm."}), 409 # Conflict

        # --- Optional but recommended: Re-check for conflicts AT THE TIME OF CONFIRMATION ---
        # Only check against other CONFIRMED bookings now
        conflicting_bookings = Booking.query.filter(
            Booking.property_id == booking.property_id,
            Booking.id != booking_id, # Exclude the booking itself
            Booking.status == 'confirmed', # IMPORTANT: Only check against confirmed
            Booking.check_in_date < booking.check_out_date,
            Booking.check_out_date > booking.check_in_date
        ).first()

        if conflicting_bookings:
            # Maybe automatically cancel this one? Or just report conflict.
            # Let's report conflict for now.
            return jsonify({"message": "Cannot confirm booking, dates now conflict with another confirmed booking."}), 409

        # --- Update Status ---
        booking.status = 'confirmed'
        # Payment status remains 'unpaid' until payment flow
        db.session.commit()

        return jsonify({
            "message": "Booking confirmed successfully.",
            "booking": booking.to_dict(include_guest=True) # Return updated booking
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error confirming booking {booking_id}: {e}")
        import traceback
        traceback.print_exc()
        # Handle specific errors like 404 if needed, otherwise generic 500
        if hasattr(e, 'code') and e.code == 404:
            abort(404, description="Booking not found")
        else:
            abort(500, description="Internal Server Error")


@api_bp.route('/host/bookings/<int:booking_id>/cancel', methods=['PATCH'])
@jwt_required()
def cancel_booking(booking_id):
    """ Cancels a booking for one of the host's properties. """
    current_user_id_str = get_jwt_identity()
    try:
        booking = Booking.query.get_or_404(booking_id)
        property_item = Property.query.get(booking.property_id)

        try:
            current_user_id = int(current_user_id_str)
        except (ValueError, TypeError):
             print(f"ERROR: Invalid JWT identity format: {current_user_id_str}")
             abort(401) # Unauthorized - bad token identity format

        # Authorization check
        if not property_item or property_item.host_id != current_user_id:
            abort(403, description="Forbidden: You do not own the property for this booking.")

        # Check if booking is in a cancellable state (e.g., pending or confirmed)
        # Add more complex logic later if needed (e.g., cannot cancel too close to check-in)
        if booking.status not in ['pending', 'confirmed']:
            return jsonify({"message": f"Cannot cancel booking with status '{booking.status}'."}), 409

        # --- Update Status ---
        booking.status = 'cancelled'
        # Consider what happens to payment status - if paid, maybe trigger refund process later?
        # For now, just update booking status.
        db.session.commit()

        return jsonify({
            "message": "Booking cancelled successfully.",
            "booking": booking.to_dict(include_guest=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error cancelling booking {booking_id}: {e}")
        import traceback
        traceback.print_exc()
        if hasattr(e, 'code') and e.code == 404:
            abort(404, description="Booking not found")
        else:
            abort(500, description="Internal Server Error")


@api_bp.route('/bookings/<int:booking_id>/pay', methods=['POST'])
@jwt_required()
def initiate_payment(booking_id):
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
         abort(401) # Bad token identity

    booking = Booking.query.get_or_404(booking_id)
    user = User.query.get(current_user_id) # Fetch user for email

    # Authorization: Only the guest who made the booking can pay
    if booking.guest_id != current_user_id:
        abort(403, description="Forbidden: You cannot pay for this booking.")

    # Status Check: Allow payment if confirmed & unpaid (or maybe pending & unpaid?)
    # Let's allow payment for 'confirmed' and 'unpaid' for now. Adjust if needed.
    if booking.status != 'confirmed' or booking.payment_status != 'unpaid':
         return jsonify({"message": f"Booking cannot be paid for in its current state (Status: {booking.status}, Payment: {booking.payment_status})."}), 409

    if not user: # Should not happen if JWT is valid, but check anyway
        abort(404, description="User not found")

    # --- Prepare Paystack Request ---
    paystack_url = "https://api.paystack.co/transaction/initialize"
    # Amount must be in Kobo (multiply Naira amount by 100)
    amount_kobo = int(booking.total_price * 100)
    # Create a unique reference (important for webhook mapping)
    # Include timestamp to ensure uniqueness even if user retries payment for same booking
    reference = f"booking_{booking.id}_{int(time.time())}"

    headers = {
        "Authorization": f"Bearer {current_app.config['PAYSTACK_SECRET_KEY']}",
        "Content-Type": "application/json",
    }
    payload = {
        "email": user.email,
        "amount": amount_kobo,
        "reference": reference,
        # Optional: Add callback_url for frontend redirect after payment attempt
        # "callback_url": "http://localhost:5173/booking-payment-status",
        "metadata": {
            "booking_id": booking.id,
            "user_id": current_user_id,
            "description": f"Payment for Booking #{booking.id}"
        }
    }

    try:
        response = requests.post(paystack_url, headers=headers, json=payload)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        paystack_data = response.json()

        if paystack_data.get("status"):
            # Store the reference on the booking BEFORE sending URL to client
            booking.paystack_reference = reference
            db.session.commit()

            # Send authorization URL back to frontend
            return jsonify({
                "message": "Payment initialization successful.",
                "authorization_url": paystack_data["data"]["authorization_url"],
                "access_code": paystack_data["data"]["access_code"], # Needed for some integrations
                "reference": reference
            }), 200
        else:
            print("Paystack initialization failed:", paystack_data.get("message"))
            return jsonify({"message": "Payment initialization failed."}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error calling Paystack API: {e}")
        return jsonify({"message": "Could not connect to payment gateway."}), 503 # Service Unavailable
    except Exception as e:
        db.session.rollback() # Rollback reference save if anything else fails
        print(f"Error initiating payment: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to initiate payment due to server error"}), 500


@api_bp.route('/payment/webhook', methods=['POST'])
def paystack_webhook():
    """ Handles incoming webhook events from Paystack. """

    # --- 1. Signature Verification ---
    paystack_secret = current_app.config['PAYSTACK_SECRET_KEY']
    # Get the signature from the header
    signature = request.headers.get('x-paystack-signature')
    # Get the raw request body (important: use get_data(), not request.json)
    raw_body = request.get_data()

    if not signature or not raw_body or not paystack_secret:
         print("Webhook Error: Missing signature, body, or secret key")
         abort(400) # Bad Request

    try:
        # Calculate the expected signature
        hash = hmac.new(paystack_secret.encode('utf-8'), raw_body, hashlib.sha512).hexdigest()
        # Compare signatures securely
        if not hmac.compare_digest(hash, signature):
            print("Webhook Error: Invalid signature")
            abort(400) # Bad Request - signature mismatch
    except Exception as e:
        print(f"Webhook Error: Signature verification failed - {e}")
        abort(400)


    # --- 2. Process Verified Event ---
    try:
        event_data = json.loads(raw_body) # Parse the verified body
        event = event_data.get('event')
        data = event_data.get('data')

        print(f"Received Paystack event: {event}") # Log received event

        if event == 'charge.success':
            reference = data.get('reference')
            amount_kobo = data.get('amount')
            status = data.get('status')

            if not reference or amount_kobo is None or status != 'success':
                 print(f"Webhook Info: Ignoring unsuccessful or incomplete charge event for ref {reference}")
                 return jsonify(success=True), 200 # Acknowledge receipt but ignore

            # Find the booking using the reference
            booking = Booking.query.filter_by(paystack_reference=reference).first()

            if not booking:
                print(f"Webhook Warning: Received success event for unknown reference {reference}")
                return jsonify(success=True), 200 # Acknowledge but can't process

            # --- 3. Verify Amount ---
            expected_amount_kobo = int(booking.total_price * 100)
            if amount_kobo != expected_amount_kobo:
                 print(f"Webhook Error: Amount mismatch for ref {reference}. Expected {expected_amount_kobo}, got {amount_kobo}")
                 # Potentially flag booking for review, don't mark as paid
                 return jsonify(success=True), 200 # Acknowledge but don't update status

            # --- 4. Update Booking Status ---
            try:
                booking.payment_status = 'paid'
                # Optionally update main status if it was 'confirmed' or 'pending'
                if booking.status in ['pending', 'confirmed']:
                    booking.status = 'confirmed' # Ensure it's confirmed after payment
                db.session.commit()
                print(f"Webhook Success: Updated booking {booking.id} for ref {reference} to paid/confirmed.")
            except Exception as db_err:
                 db.session.rollback()
                 print(f"Webhook Error: DB update failed for ref {reference} after successful charge: {db_err}")
                 # Log this error critically - payment received but DB not updated!
                 return jsonify(success=False), 500 # Internal error updating DB

        # Handle other events like charge.failed if needed
        # elif event == 'charge.failed':
        #     # Find booking by reference, mark payment_status as 'failed' maybe
        #     pass

        # Acknowledge receipt of the event to Paystack
        return jsonify(success=True), 200

    except json.JSONDecodeError:
        print("Webhook Error: Could not decode JSON body")
        abort(400)
    except Exception as e:
         print(f"Webhook Error: General processing error - {e}")
         import traceback
         traceback.print_exc()
         # Return 200 OK to Paystack even if processing fails, to prevent retries
         # But log the error critically for investigation.
         return jsonify(success=False, error="Internal processing error"), 200
    

@api_bp.route('/properties/<int:property_id>/reviews', methods=['POST'])
@jwt_required()
def create_review(property_id):
    """ Creates a review for a property if the user had a completed stay. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
         abort(401, description="Invalid user identity in token.")

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    rating = data.get('rating')
    comment = data.get('comment')

    # --- Validation ---
    if rating is None:
         return jsonify({"message": "Missing required field: rating"}), 400
    try:
        rating = int(rating)
        if not 1 <= rating <= 5:
             raise ValueError("Rating must be between 1 and 5.")
    except (ValueError, TypeError):
         return jsonify({"message": "Invalid rating value. Must be an integer between 1 and 5."}), 400

    # --- Authorization: Check for Completed Stay ---
    property_exists = Property.query.get(property_id)
    if not property_exists:
        abort(404, description="Property not found.")

    completed_booking = Booking.query.filter(
        Booking.guest_id == current_user_id,
        Booking.property_id == property_id,
        Booking.status == 'confirmed', # Must be confirmed
        Booking.check_out_date < date.today() # Check-out date must be in the past
    ).first()

    if not completed_booking:
        return jsonify({"message": "You can only review properties after a completed stay."}), 403 # Forbidden

    # --- Prevent Duplicate Reviews (User reviewing same property again) ---
    existing_review = Review.query.filter_by(
        guest_id=current_user_id,
        property_id=property_id
    ).first()

    if existing_review:
        return jsonify({"message": "You have already reviewed this property."}), 409 # Conflict

    # --- Create Review ---
    try:
        new_review = Review(
            guest_id=current_user_id,
            property_id=property_id,
            rating=rating,
            comment=comment
        )
        db.session.add(new_review)
        db.session.commit()

        # Ensure author relationship is loaded for to_dict
        # This might happen automatically depending on lazy loading settings
        # Or force load if needed: db.session.refresh(new_review) or query again
        return jsonify({
            "message": "Review submitted successfully.",
            "review": new_review.to_dict(include_author=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating review: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to submit review due to server error"}), 500


@api_bp.route('/properties/<int:property_id>/reviews', methods=['GET'])
def get_reviews(property_id):
    """ Gets all reviews for a specific property. """
    try:
        # Check if property exist
        property_exists = Property.query.get(property_id)
        if not property_exists:
            abort(404, description="Property not found.")

        reviews = Review.query.filter_by(property_id=property_id).order_by(Review.created_at.desc()).all()
        reviews_list = [r.to_dict(include_author=True) for r in reviews]
        return jsonify(reviews_list)

    except Exception as e:
        print(f"Error fetching reviews for property {property_id}: {e}")
        abort(500, description="Internal Server Error")


# --- Get Booked Dates for a Property ---
@api_bp.route('/properties/<int:property_id>/booked-dates', methods=['GET'])
def get_booked_dates(property_id):
    """ Gets a list of confirmed booked date ranges for a specific property. """
    # Ensure property exists
    prop = Property.query.get_or_404(property_id)
    try:
        # Find confirmed bookings for this property
        booked_ranges = Booking.query.with_entities(
            Booking.check_in_date,
            Booking.check_out_date
        ).filter(
            Booking.property_id == property_id,
            Booking.status == 'confirmed'
        ).order_by(Booking.check_in_date).all()

        # Format the response for the date picker library
        # (react-date-range often expects {startDate, endDate})
        # NOTE: The range usually includes start but excludes end for libraries.
        # Paystack booking was INCLUSIVE of end date. Need consistency.
        # Let's return exact check-in/check-out from DB for now.
        # Frontend might need to adjust for its library.
        booked_dates_list = [
            {
                "startDate": booked.check_in_date.isoformat(),
                "endDate": booked.check_out_date.isoformat()
                # Maybe adjust endDate based on library needs? e.g., subtract one day? Check library docs.
                # For now, return the actual stored range.
            }
            for booked in booked_ranges
        ]

        return jsonify(booked_dates_list)

    except Exception as e:
        print(f"Error fetching booked dates for property {property_id}: {e}")
        abort(500, description="Internal Server Error fetching booked dates")


# --- Update Property Route (Partial Update for Text/Numeric Fields) ---
@api_bp.route('/properties/<int:property_id>', methods=['PATCH'])
@jwt_required()
def update_property(property_id):
    """ Updates details for a specific property. Only owner can update. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
         abort(401, description="Invalid user identity in token.")

    property_to_update = Property.query.get_or_404(property_id)

    # --- Authorization Check: Only the host/owner can update ---
    if property_to_update.host_id != current_user_id:
        abort(403, description="Forbidden: You do not have permission to update this property.")

    # --- Get data from request.form (for text fields primarily) ---
    # Note: Handling file updates (add/remove) in PATCH is complex.
    # This example focuses on updating non-file fields sent via form-data.
    data = request.form

    if not data:
        return jsonify({"message": "No update data provided"}), 400

    # --- Update Fields if Present in Request ---
    updated = False # Flag to check if any updates were made
    possible_fields = ['title', 'description', 'address', 'city', 'state', 'price_per_night', 'max_guests', 'num_bedrooms', 'num_bathrooms', 'amenities', 'power_backup_details', 'latitude', 'longitude']

    try:
        for field in possible_fields:
            if field in data:
                new_value = data[field]
                # Perform type conversion and validation as needed
                if field in ['price_per_night', 'num_bathrooms', 'latitude', 'longitude']:
                    if new_value: setattr(property_to_update, field, float(new_value))
                    else: setattr(property_to_update, field, None) # Allow clearing optional floats
                elif field in ['max_guests', 'num_bedrooms']:
                     if new_value: setattr(property_to_update, field, int(new_value))
                     else: setattr(property_to_update, field, 0) # Or default? Or disallow clearing?
                elif field == 'amenities':
                     # Assuming comma-separated string from form
                     amenities_list = [a.strip() for a in new_value.split(',') if a.strip()]
                     setattr(property_to_update, field, amenities_list)
                else: # String fields
                    setattr(property_to_update, field, new_value)
                updated = True

        if not updated:
             return jsonify({"message": "No valid fields provided for update"}), 400

        db.session.commit()
        return jsonify({
            "message": "Property updated successfully",
            "property": property_to_update.to_dict()
        }), 200

    except (ValueError, TypeError) as e:
        db.session.rollback()
        print(f"Error processing update data: {e}")
        return jsonify({"message": "Invalid data type provided for update."}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error updating property {property_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to update property due to server error"}), 500


# --- Delete Property Route ---
@api_bp.route('/properties/<int:property_id>', methods=['DELETE'])
@jwt_required()
def delete_property(property_id):
    """ Deletes a specific property. Only owner can delete. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
         abort(401, description="Invalid user identity in token.")

    property_to_delete = Property.query.get_or_404(property_id)

    # --- Authorization Check: Only the host/owner can delete ---
    if property_to_delete.host_id != current_user_id:
        abort(403, description="Forbidden: You do not have permission to delete this property.")

    try:
        db.session.delete(property_to_delete)
        db.session.commit()
        # Standard practice is to return 204 No Content on successful DELETE
        # Alternatively return 200 OK with a message
        return '', 204 # No content response body for 204

        # Or:
        # return jsonify({"message": "Property deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting property {property_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to delete property due to server error"}), 500


# --- NEW: Get Listings for Current User ---
@api_bp.route('/my-listings', methods=['GET'])
@jwt_required()
def get_my_listings():
    """ Gets all properties listed by the currently logged-in user. """
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
         abort(401, description="Invalid user identity in token.")

    try:
        user_properties = Property.query.filter_by(host_id=current_user_id).order_by(Property.created_at.desc()).all()
        properties_list = [prop.to_dict() for prop in user_properties]
        return jsonify(properties_list)
    except Exception as e:
        print(f"Error fetching listings for user {current_user_id}: {e}")
        abort(500, description="Internal Server Error")



# --- Add other routes later (Users, Bookings, Auth, etc.) ---