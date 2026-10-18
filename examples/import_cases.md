# Text Message Import Specification (examples/import_cases.md)

This file defines the input-to-output contract for importing casual text messages sent by trip members.

Input: Dave paid $45.50 for gas
Output: paidBy=Dave | cents=4550 | desc=gas

Input: Carol $18 parking at trailhead
Output: paidBy=Carol | cents=1800 | desc=parking at trailhead

Input: $80.10 coffee and bagels. Ray
Output: paidBy=Ray | cents=8010 | desc=coffee and bagels

Input: Linda paid $1,200 for the cabin deposit
Output: paidBy=Linda | cents=120000 | desc=the cabin deposit

Input: Can someone pick up ice?
Output: NEEDS REVIEW | reason=no recognizable amount or payer
