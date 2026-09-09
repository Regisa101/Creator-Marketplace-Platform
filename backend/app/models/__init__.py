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
from app.models.creator_shortlist import CreatorShortlist   # ← Increment 5
from app.models.creator_invite import CreatorInvite         # ← Increment 5
from app.models.message import Message                       # ← Increment 5 (Workspace)
from app.models.calendar_event import CalendarEvent           # ← Increment 5 (Workspace)
from app.models.deliverable import Deliverable                 # ← Increment 5 (Workspace)