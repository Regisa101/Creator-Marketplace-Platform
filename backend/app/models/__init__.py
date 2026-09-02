"""
MODELS PACKAGE
--------------
This makes all models available from one place.
"""

from app.models.user import User
from app.models.creator_profile import CreatorProfile
from app.models.business_profile import BusinessProfile
from app.models.creator_social import CreatorSocial
from app.models.campaign import Campaign          # ← ADD THIS
from app.models.application import Application    # ← ADD THIS
from app.models.saved_campaign import SavedCampaign