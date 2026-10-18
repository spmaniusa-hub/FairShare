# Card alerts: the specification for importing card-alert texts

Card list: 2208 = Linda | 4417 = Dave | 9031 = Carol | 5150 = Ray

This specification defines how FairShare imports automated SMS bank alerts from Switchback Community Credit Union (fictional). All amounts must pass through parseDollars() to ensure whole integer cents. Any line that cannot be matched to a known card member or properly parsed must be placed in "Needs review" with an explicit reason.

Input: Switchback CU: Purchase of $45.50 at SUMMIT FUEL #12 on card ending 4417.
Output: paidBy=Dave | cents=4550 | desc=SUMMIT FUEL #12
Format: Format A (Purchase of $amount at Merchant on card ending XXXX)

Input: SCCU ALERT - Card x2208 charged $1,200.00 - BEAR HOLLOW CABINS
Output: paidBy=Linda | cents=120000 | desc=BEAR HOLLOW CABINS
Format: Format B (Card xXXXX charged $amount - Merchant)
Awkward choice: Comma thousands ($1,200.00). Must parse to exactly 120000 cents without truncating at the comma.

Input: Switchback Credit Union: You spent $18 at TRAILHEAD PARKING with card 9031. Available balance: $2,340.12
Output: paidBy=Carol | cents=1800 | desc=TRAILHEAD PARKING
Format: Format C (You spent $amount at Merchant with card XXXX. Available balance: $amount)
Awkward choice: Missing cents ($18 -> 1800 cents) and a secondary balance figure ($2,340.12) that must be ignored in favor of the spent amount.

Input: Switchback CU: Purchase of $64.30 at RIDGE CAMPGROUND on card ending 5150.
Output: paidBy=Ray | cents=6430 | desc=RIDGE CAMPGROUND
Format: Format A with Ray (card 5150)

Input: Switchback CU: Purchase of $14.25 at MOUNTAIN BAKERY on card ending 7777.
Output: NEEDS REVIEW | reason=card 7777 is not on the card list
Awkward choice: Unknown card ending 7777. The card number is detected, but since 7777 is not associated with Linda, Dave, Carol, or Ray, it must not be imported and must name the card in the review reason.

Input: SCCU ALERT - Declined: Card x2208 attempted $65.00 at ALPINE GEAR
Output: NEEDS REVIEW | reason=declined transaction or unreadable card alert
Awkward choice: Declined transaction. A card alert without a completed charge must be flagged for human review rather than silently counted or discarded.

Input: Fwd: SCCU ALERT - Card x5150 charged $35.00 - PINECREST MARKET
Output: paidBy=Ray | cents=3500 | desc=PINECREST MARKET
Format: Format B with forwarded prefix
Awkward choice: Forwarded email/text prefix "Fwd:". The parser must strip forwarded prefixes so legitimate forwarded bank alerts parse cleanly.
