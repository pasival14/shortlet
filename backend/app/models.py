from . import db, bcrypt # Import db and bcrypt from the app/__init__.py
from sqlalchemy.sql import func # For default timestamps
from sqlalchemy.dialects.postgresql import JSONB # If using PostgreSQL for JSON
from sqlalchemy import JSON, Text # Standard JSON type, works for SQLite too


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128)) # Store hashed password, not plain text
    first_name = db.Column(db.String(64), nullable=False)
    last_name = db.Column(db.String(64), nullable=False)
    # 'guest' or 'host' - consider using an Enum later if needed
    user_type = db.Column(db.String(10), nullable=False, default='host')
    profile_pic_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Relationships (defined later if needed for easier querying, but conceptually here)
    properties = db.relationship('Property', backref='host', lazy=True) # Properties hosted by this user
    bookings = db.relationship('Booking', backref='guest', lazy=True) # Bookings made by this user
    reviews = db.relationship('Review', backref='author', lazy=True) # Reviews written by this user

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Serializes User object to a dictionary, excluding password."""
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "user_type": self.user_type,
            "profile_pic_url": self.profile_pic_url,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<User {self.email}>'
    

class Property(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # Link to the User who is the host
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(80), nullable=False)
    state = db.Column(db.String(80), nullable=False) # e.g., Lagos, Rivers
    price_per_night = db.Column(db.Float, nullable=False)
    max_guests = db.Column(db.Integer, nullable=False, default=1)
    num_bedrooms = db.Column(db.Integer, nullable=False, default=1)
    num_bathrooms = db.Column(db.Float, nullable=False, default=1) # Use Float for 1.5 baths etc.

    # Store amenities as a JSON list e.g., ["WiFi", "Pool", "AC", "Kitchen"]
    amenities = db.Column(JSON, nullable=True)

    # Specific field for power backup info - crucial in Nigeria
    power_backup_details = db.Column(db.String(255), nullable=True, default='None') # e.g., "Generator (6pm-7am)", "Solar Inverter (24/7)", "PHCN Only"

    latitude = db.Column(db.Float, nullable=True) # For map integration
    longitude = db.Column(db.Float, nullable=True)

    # Store image URLs as a JSON list e.g., ["url1.jpg", "url2.png"]
    listing_photos = db.Column(JSON, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    # Relationships
    bookings = db.relationship('Booking', backref='property', lazy=True, cascade="all, delete-orphan")
    reviews = db.relationship('Review', backref='property', lazy=True, cascade="all, delete-orphan")

    def to_dict(self): # Basic serialization helper
         return {
            'id': self.id,
            'host_id': self.host_id,
            'title': self.title,
            'description': self.description,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'price_per_night': self.price_per_night,
            'max_guests': self.max_guests,
            'num_bedrooms': self.num_bedrooms,
            'num_bathrooms': self.num_bathrooms,
            'amenities': self.amenities or [],
            'power_backup_details': self.power_backup_details,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'listing_photos': self.listing_photos or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Add host info or average review rating here later if needed
        }

    def __repr__(self):
        return f'<Property {self.title}>'
    

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    guest_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    check_in_date = db.Column(db.Date, nullable=False) # Store date only
    check_out_date = db.Column(db.Date, nullable=False)
    num_guests = db.Column(db.Integer, nullable=False)
    total_price = db.Column(db.Float, nullable=False) # Calculated at time of booking
    # Consider Enums for status fields if needed
    status = db.Column(db.String(20), nullable=False, default='pending') # e.g., pending, confirmed, cancelled, completed
    payment_status = db.Column(db.String(20), nullable=False, default='unpaid') # e.g., unpaid, paid, refunded
    paystack_reference = db.Column(db.String(100), nullable=True, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self, include_property=False, include_guest=False):
        data = {
            'id': self.id,
            'guest_id': self.guest_id,
            'property_id': self.property_id,
            'check_in_date': self.check_in_date.isoformat(), # Format dates as strings
            'check_out_date': self.check_out_date.isoformat(),
            'num_guests': self.num_guests,
            'total_price': self.total_price,
            'status': self.status,
            'payment_status': self.payment_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        # Optionally include related data (use cautiously to avoid circular references if not handled well)
        if include_property and self.property:
            # Include limited property info, not the full property.to_dict() perhaps
            data['property'] = {
                'id': self.property.id,
                'title': self.property.title,
                'city': self.property.city,
                'state': self.property.state
            }
        if include_guest and self.guest:
            # Include limited guest info (be careful with privacy)
            data['guest'] = {
                'id': self.guest.id,
                'first_name': self.guest.first_name,
                'last_name': self.guest.last_name
            }
        return data

    def __repr__(self):
        return f'<Booking {self.id} for Property {self.property_id}>'
    

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    guest_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False) # e.g., 1 to 5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Add relationship back to User if not already there (from User model's backref)
    # If 'author' backref exists in User model's reviews relationship, this isn't strictly needed
    # author = db.relationship('User')

    def to_dict(self, include_author=False):
        data = {
            'id': self.id,
            'guest_id': self.guest_id, # Keep internal reference
            'property_id': self.property_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_author and self.author: # Assumes 'author' relationship or backref exists
            # Only include non-sensitive author info
            data['author'] = {
                # 'id': self.author.id, # Maybe don't expose author ID publicly
                'first_name': self.author.first_name,
                # 'last_name': self.author.last_name # Maybe omit last name for privacy?
            }
        return data

    def __repr__(self):
        return f'<Review {self.id} by User {self.guest_id} for Property {self.property_id}>'