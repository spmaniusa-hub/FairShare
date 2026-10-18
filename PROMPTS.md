# Prompts Log: FairShare Bank Alert Import (Session 2)

This document records the exact sequence of prompts used to guide the AI assistant through the specification, test-driven development (TDD), implementation, rule documentation, and verification phases for **Day 2 · Session 2 · Homework: The Treasurer's Inbox - Bank Alert Import**.

Following the core Session 2 philosophy:
> **"Show it. Write it down. Make it prove it."**

---

## 1. Phase 1: Baseline Checkpoint & Environment Setup

### Prompt 1.1: Establishing Checkpoint 2 Baseline & Rules
```text
Role: You are pair programming on FairShare, a whole-cent expense sharing app.
Current Task: Set up the Session 2 baseline ("checkpoint 2") with 15 passing verification tests in tests.js and tests.html.
Constraints from AGENTS.md:
1. Single money converter: parseDollars() is canonical. Never use parseFloat(...) * 100 or Math.trunc.
2. Store and calculate all money in whole integer cents.
3. Every non-blank line must either import as an expense or be listed under "Needs review" with a descriptive reason (no silent drops).

Please ensure tests.js has the 15 baseline tests covering whole dollar conversion, cents, comma thousands ($1,200.00), missing cents ($18), demo text messages, and invariant batch checks. Verify all 15 pass.
```

### Prompt 1.2: Baseline Git Save Point
```bash
git add .
git commit -m "chore: baseline checkpoint 2 with 15 passing tests"
```

---

## 2. Phase 2: Specification First (`examples/card_alerts.md`)

### Prompt 2.1: Defining Card Alert Examples
```text
Task: Create examples/card_alerts.md defining the specification for automated bank-alert text messages from Switchback Community Credit Union (SCCU).

Card Directory:
- 2208 = Linda
- 4417 = Dave
- 9031 = Carol
- 5150 = Ray

Requirements:
- Follow the exact Input: and Output: style from examples/import_cases.md.
- Cover all 3 fictional formats:
  - Format A: "Switchback CU: Purchase of $45.50 at SUMMIT FUEL #12 on card ending 4417."
  - Format B: "SCCU ALERT - Card x2208 charged $1,200.00 - BEAR HOLLOW CABINS"
  - Format C: "Switchback Credit Union: You spent $18 at TRAILHEAD PARKING with card 9031. Available balance: $2,340.12"
- Include at least 2 deliberately chosen awkward cases:
  1. Comma thousands ($1,200.00 -> 120000 cents, not truncated to $1.20 or $1.00).
  2. Missing cents ($18 -> 1800 cents) and ignoring secondary balance ($2,340.12).
  3. Unknown cardholder (card x7777 -> "NEEDS REVIEW | reason=card 7777 is not on the card list").
  4. Declined/unrecognized transaction ("SCCU ALERT - Declined: Card x2208 attempted $65.00 at ALPINE GEAR").
  5. Forwarded email/SMS prefix ("Fwd: ...").
- Document the reason for each awkward choice.
```

---

## 3. Phase 3: Tests Before Code (Seeing Red)

### Prompt 3.1: Adding Failing Tests to `tests.js`
```text
Read @AGENTS.md and @examples/card_alerts.md.

TASK: Add one test to tests.js for each of the 7 examples in examples/card_alerts.md.
Do NOT change importer.js yet. I expect the new tests to fail.

FORMAT: List each test you added, then run the tests and tell me which ones failed.
Do not modify or break the original 15 baseline tests.
```

### Prompt 3.2: Capturing Red Tests Proof & Save Point Commit
```bash
# Capture screenshot of tests.html showing the failing tests
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=tests_red.png --window-size=1200,2400 file://$(pwd)/tests.html

# Git commit save point
git add examples/card_alerts.md tests.js tests.html tests_red.png
git commit -m "test: add card alert specification and failing tests (tests red)"
```

---

## 4. Phase 4: Implementation (Turning Red to Green)

### Prompt 4.1: Extending `importer.js`
```text
Read @AGENTS.md and @examples/card_alerts.md.

TASK: Extend importer.js so that every test in tests.js passes (all 15 baseline tests + the 7 new card alert tests = 22 checks passing).

Implementation Requirements:
1. Use parseDollars() as the single converter for all money. Never use parseFloat(...) * 100.
2. Detect card alert lines (Switchback CU, SCCU, or card ending patterns).
3. Strip forwarded prefixes ("Fwd:", "FWD:").
4. Handle Format A, Format B, and Format C.
5. In Format C, extract the spent amount and explicitly ignore secondary balance amounts ("Available balance: $X,XXX.XX").
6. Match card ending 4 digits against the directory: 2208 (Linda), 4417 (Dave), 9031 (Carol), 5150 (Ray).
7. If card ending is unknown (e.g. 7777), flag under "Needs review" with the reason explicitly naming the card: "card <digits> is not on the card list".
8. Flag declined or unreadable alerts under "Needs review".
9. Maintain invariant: Total Non-Blank Lines = Imported Count + Flagged Count.

Run node tests.js after making changes and confirm all 22 tests pass green.
```

### Prompt 4.2: Capturing Green Tests Proof & Save Point Commit
```bash
# Capture screenshot of tests.html showing all 22 tests passing
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=tests_green.png --window-size=1200,2400 file://$(pwd)/tests.html

# Git commit save point
git add importer.js tests_green.png
git commit -m "feat: implement card alert importer and pass all 22 tests (tests green)"
```

---

## 5. Phase 5: Writing Rules Down & Memory Check

### Prompt 5.1: Updating `AGENTS.md`
```text
Task: Update AGENTS.md to incorporate the new standing orders for card alerts and update existing rules:
1. Update Rule 2 (Specification First) to mandate reading BOTH examples/import_cases.md AND examples/card_alerts.md.
2. Add Rule 5 (Card Alert Directory & Unknown Card Rule):
   - Define the card directory (2208=Linda, 4417=Dave, 9031=Carol, 5150=Ray).
   - Require unknown cards to be placed in "Needs review" with reason naming the card ("card <digits> is not on the card list").
   - Mandate ignoring secondary balance amounts in favor of spent amounts.
   - Mandate stripping forwarded prefixes ("Fwd:").
```

### Prompt 5.2: Memory Check in Fresh Conversation
```text
Please process the following raw bank alert for FairShare:

<alerts>
Switchback CU: Purchase of $22.50 at TRAILHEAD CAFE on card ending 8888.
</alerts>

How should FairShare handle this alert?
```
*(Document the agent's unprompted response citing Rule 5 and unknown card handling in `memory_check.md`)*.

---

## 6. Phase 6: UI Live Preview & Verification

### Prompt 6.1: Enhancing UI for Live Bulk Paste & Review
```text
Task: Update index.html, app.js, and style.css to support the full Treasurer's Inbox workflow:
1. Add a clearly labeled Club Card Directory card showing Linda (2208), Dave (4417), Carol (9031), and Ray (5150).
2. Add a bulk paste textarea with buttons: "Parse & Preview", "Load Sample Mixed Paste", and "Clear Box".
3. Add a live Import Preview section showing:
   - Count badge (e.g. "6 expenses") and total amount badge (e.g. "$1,408.30").
   - A structured preview table of parsed items with payer, amount in green mono font, description, and source/card.
   - A dedicated high-contrast "Needs Review" alert box listing every flagged line with its raw text and human-readable reason.
   - "Add Expenses to Ledger" button to commit parsed items into the ledger.
```

### Prompt 6.2: Capturing Live Preview Screenshot & Commit
```bash
# Capture screenshot of index.html with sample mixed paste preview rendered
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=import_preview.png --window-size=1200,2500 "file://$(pwd)/index.html?sample=true"

# Git commit save point
git add AGENTS.md app.js index.html style.css import_preview.png memory_check.md sample_alerts.txt
git commit -m "docs: update AGENTS.md with card-alert rules and add preview artifacts"
```

---

## 7. Phase 7: Final Packaging & Submission Verification

### Prompt 7.1: Git Log Generation & Archive Packaging
```bash
# Record git log history
git log --oneline > git_log.txt
git add git_log.txt
git commit -m "chore: record git log history"

# Package into required submission zip format
zip -r subramanian_s2_hw1.zip subramanian_s2_hw1/
unzip -l subramanian_s2_hw1.zip
```
