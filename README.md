This is a great idea\! A well-structured `README.md` is essential for any project. Based on the files you've provided, here's a comprehensive `README.md` that you can use for your project.

# Shortlet - A Short-Term Rental Marketplace

Shortlet is a full-stack web application that provides a platform for users to list, discover, and book short-term rental properties. It is built with a React frontend and a Flask (Python) backend, and it includes features like user authentication, property listings with image uploads, booking management, and an interactive map view.

## Features

  - **User Authentication**: Users can sign up, log in, and manage their profiles. Authentication is handled using JWT (JSON Web Tokens).
  - **Property Listings**: Users can create, view, update, and delete property listings.
  - **Image Uploads**: Property listings can include multiple images, which are uploaded to and served from Cloudinary.
  - **Interactive Map View**: Properties are displayed on an interactive map using Leaflet, allowing users to easily visualize their locations.
  - **Advanced Filtering**: Users can filter properties by various criteria, such as price, number of bedrooms, and amenities.
  - **Booking System**: Users can book properties for specific dates. The system checks for booking conflicts to prevent double-booking.
  - **Payment Integration**: The application is integrated with Paystack for processing payments.
  - **User Dashboard**: Users have a dashboard where they can view their bookings, manage their listings, and update their profiles.
  - **Responsive Design**: The application is designed to be responsive and work on various screen sizes.

## Tech Stack

### Frontend

  - **React**: A JavaScript library for building user interfaces.
  - **React Router**: For handling routing within the application.
  - **Axios**: For making HTTP requests to the backend API.
  - **Leaflet**: An open-source JavaScript library for interactive maps.
  - **Tailwind CSS**: A utility-first CSS framework for styling.
  - **Vite**: A fast build tool and development server for modern web projects.

### Backend

  - **Flask**: A lightweight web framework for Python.
  - **Flask-SQLAlchemy**: For interacting with the database.
  - **Flask-Bcrypt**: For hashing passwords.
  - **Flask-JWT-Extended**: For handling JWT-based authentication.
  - **Cloudinary**: For cloud-based image and video management.
  - **Paystack**: For processing payments.

## Getting Started

### Prerequisites

  - Node.js and npm (or yarn)
  - Python 3 and pip
  - A Cloudinary account
  - A Paystack account

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/shortlet.git
    cd shortlet
    ```

2.  **Set up the backend:**

      - Navigate to the `backend` directory:
        ```bash
        cd backend
        ```
      - Create and activate a virtual environment:
        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
        ```
      - Install the required Python packages:
        ```bash
        pip install -r requirements.txt
        ```
      - Create a `.env` file in the `backend` directory and add the following environment variables:
        ```env
        FLASK_APP=run.py
        FLASK_ENV=development
        DATABASE_URL=sqlite:///yourdatabase.db
        SECRET_KEY=yoursecretkey
        JWT_SECRET_KEY=yourjwtsecretkey
        CLOUDINARY_CLOUD_NAME=yourcloudinarycloudname
        CLOUDINARY_API_KEY=yourcloudinaryapikey
        CLOUDINARY_API_SECRET=yourcloudinaryapisecret
        PAYSTACK_SECRET_KEY=yourpaystacksecretkey
        ```
      - Initialize the database:
        ```bash
        flask db init
        flask db migrate -m "Initial migration."
        flask db upgrade
        ```

3.  **Set up the frontend:**

      - Navigate to the `frontend` directory:
        ```bash
        cd ../frontend
        ```
      - Install the required npm packages:
        ```bash
        npm install
        ```
      - Create a `.env.local` file in the `frontend` directory and add the following environment variable:
        ```env
        VITE_API_BASE_URL=http://127.0.0.1:5000/api
        ```

### Running the Application

1.  **Start the backend server:**

      - In the `backend` directory, run:
        ```bash
        flask run
        ```

2.  **Start the frontend development server:**

      - In the `frontend` directory, run:
        ```bash
        npm run dev
        ```

The application should now be running at `http://localhost:5173`.

## API Endpoints

The backend provides the following API endpoints:

  - `POST /api/auth/register`: Register a new user.
  - `POST /api/auth/login`: Log in a user and get JWT tokens.
  - `GET /api/auth/profile`: Get the profile of the currently logged-in user.
  - `PATCH /api/auth/profile`: Update the profile of the currently logged-in user.
  - `POST /api/auth/refresh`: Refresh an access token.
  - `GET /api/properties`: Get a list of properties with optional filters.
  - `POST /api/properties`: Create a new property listing.
  - `GET /api/properties/:propertyId`: Get details of a specific property.
  - `PATCH /api/properties/:propertyId`: Update a specific property.
  - `DELETE /api/properties/:propertyId`: Delete a specific property.
  - `POST /api/properties/:propertyId/bookings`: Create a new booking for a property.
  - `GET /api/my-bookings`: Get a list of bookings made by the current user.
  - `GET /api/host/bookings`: Get a list of bookings for properties hosted by the current user.
  - `PATCH /api/host/bookings/:bookingId/confirm`: Confirm a booking.
  - `PATCH /api/host/bookings/:bookingId/cancel`: Cancel a booking.
  - `POST /api/bookings/:bookingId/pay`: Initiate payment for a booking.
  - `POST /api/payment/webhook`: Handle payment webhooks from Paystack.
  - `POST /api/properties/:propertyId/reviews`: Create a review for a property.
  - `GET /api/properties/:propertyId/reviews`: Get reviews for a property.
  - `GET /api/properties/:propertyId/booked-dates`: Get booked dates for a property.
  - `GET /api/my-listings`: Get listings for the current user.

## Contributing

Contributions are welcome\! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
