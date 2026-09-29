"""
MIGRATION: New pricing model (10% platform fee on top of the creator payment)

What this does (idempotent - safe to re-run):

1. Adds campaigns.platform_fee_rate (default 0.10 = 10%).
2. Removes the old fixed "CreatorHub standard rate" campaigns:
     - campaigns that used the standard rate get the equivalent amount as a
       normal "Custom amount" (old schedule: one-time 500, monthly 2000,
       long-term 5000, yearly 5000) so the budget they were advertising
       is preserved. Campaigns that had no derivable amount (e.g. weekly)
       get their compensation_type cleared so the brand picks a new one.
3. Sets pricing_model = 'Custom budget' on every campaign (the only pricing
   model left), which also fills any NULLs so publishing keeps working.

NOT touched on purpose: existing contracts and their evidence_snapshot.
Those are historical records of what the parties agreed to.

Run from the backend folder:
    python add_platform_fee_model_migration.py
"""

from sqlalchemy import text

from app.database import engine

PLATFORM_FEE_RATE = "0.10"

STATEMENTS = [
    # 1. Fee rate column
    (
        "Add campaigns.platform_fee_rate",
        f"ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC(5,4) NOT NULL DEFAULT {PLATFORM_FEE_RATE}",
    ),
    # 2a. Standard-rate campaigns -> Custom amount with the equivalent amount
    (
        "Convert standard-rate campaigns to Custom amount",
        """
        UPDATE campaigns
           SET budget = CASE lower(trim(engagement_type))
                            WHEN 'one-time'  THEN 500
                            WHEN 'monthly'   THEN 2000
                            WHEN 'long-term' THEN 5000
                            WHEN 'yearly'    THEN 5000
                        END,
               compensation_type = 'Custom amount'
         WHERE lower(trim(compensation_type)) = 'creatorhub standard rate'
           AND lower(trim(engagement_type)) IN ('one-time', 'monthly', 'long-term', 'yearly')
        """,
    ),
    # 2b. Anything still marked standard rate had no amount -> clear it
    (
        "Clear standard-rate campaigns with no derivable amount",
        """
        UPDATE campaigns
           SET compensation_type = NULL
         WHERE lower(trim(compensation_type)) = 'creatorhub standard rate'
        """,
    ),
    # 3. Single pricing model
    (
        "Set pricing_model = 'Custom budget'",
        """
        UPDATE campaigns
           SET pricing_model = 'Custom budget'
         WHERE pricing_model IS NULL OR pricing_model <> 'Custom budget'
        """,
    ),
    # Make sure every campaign carries the fee rate
    (
        "Backfill platform_fee_rate",
        f"UPDATE campaigns SET platform_fee_rate = {PLATFORM_FEE_RATE} WHERE platform_fee_rate IS NULL",
    ),
]


def main() -> None:
    print("=" * 50)
    print("Updating campaigns to the 10% platform fee pricing model...")
    print("=" * 50)

    with engine.begin() as conn:
        for label, statement in STATEMENTS:
            result = conn.execute(text(statement))
            affected = result.rowcount if result.rowcount not in (None, -1) else "n/a"
            print(f"  - {label}: rows affected = {affected}")

    print("\nDone. Campaigns now use: your amount + 10% platform fee on top.")


if __name__ == "__main__":
    main()