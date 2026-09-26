"""
CreatorHub API schemas.

Only schemas used by the current CreatorHub workflow are exported here.

Current workflow:

Creator applies
    ↓
Brand reviews application
    ↓
Brand selects creator
    ↓
Brand pays CreatorHub
    ↓
Campaign closes
    ↓
Creator receives notification
"""

from app.schemas.user import (
    UserBase,
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    AccountDeleteRequest,
)

from app.schemas.creator import (
    CreatorPortfolioItem,
    CreatorSocialBase,
    CreatorOnboardingComplete,
    CreatorOnboardingProgress,
)

from app.schemas.business import (
    BusinessOnboardingComplete,
    BusinessOnboardingProgress,
)

from app.schemas.campaign import (
    CampaignBase,
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
)

from app.schemas.application import (
    ApplicationBase,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
)

from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentResponse,
)

from app.schemas.contract import (
    ContractFinalizeRequest,
    ContractResponse,
    ContractSummary,
)