from app import create_app

app = create_app()

if __name__ == '__main__':
    # Use debug=True from .flaskenv or environment variable if preferred
    app.run()