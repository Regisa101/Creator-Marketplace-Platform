# This makes the models folder a Python package
# We import the User model here so we can do:
# from app.models import User

from app.models.user import User

# If we add more models later (Campaign, Application, etc.),
# we'll import them here too