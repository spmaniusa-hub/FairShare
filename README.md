# FairShare: Bank Alert Import (Session 2 Homework)

**Author:** Mani Subramanian  
**Course:** Vibe Coding Workshop · Day 2: Core Prompting Concepts & Tools  
**Assignment:** Session 2 Homework — The Treasurer's Inbox: Bank Alert Import  
**Submission Package:** `subramanian_s2_hw1.zip`

---

## 1. How to Try It

FairShare is built in plain HTML, CSS, and modern vanilla JavaScript. No package managers, build steps, or server setups are required.

### A. Run the Verification Tests
1. Double-click `fairshare/tests.html` in your file browser (or open it in Chrome, Safari, Firefox, or Edge).
2. Alternatively, run the test suite via Node.js in your terminal:
   ```bash
   node fairshare/tests.js
   ```
3. **Result:** You will see all 22 verification checks passing (15 baseline tests from Session 2 + 7 new card-alert specification tests).

### B. Try the Web Application & Live Importer
1. Double-click `fairshare/index.html` to open FairShare in any browser.
2. In the **"Import Messages & Bank Alerts"** card:
   - Click the **"Load Sample Mixed Paste"** button (or paste your own raw text lines).
   - Click **"Parse & Preview"**.
3. Inspect the live preview:
   - **Summary Badges:** Shows total valid expenses (e.g., `6 expenses`) and combined dollar total (e.g., `$1,408.30`).
   - **Expense Breakdown Table:** Shows each parsed item mapped to its payer (Linda, Dave, Carol, or Ray), integer cents amount, cleaned description, and card source.
   - **Needs Review Box:** Shows every flagged line (unknown cards, unreadable messages, declined charges) with a plain-English explanation.
4. Click **"Add 6 Expenses to Ledger"**:
   - The expenses are immediately added to the live ledger.
   - The 3-way split breakdown, member net balances ("Who Owes & Who Gets Back"), and optimal settlement plan ("How to Settle Up") recalculate automatically to the penny.

---

## 2. What Works

1. **Three Core Bank Alert Formats Supported:**
   - **Format A (Purchase at merchant on card ending XXXX):**  
     `Switchback CU: Purchase of $45.50 at SUMMIT FUEL #12 on card ending 4417.` $\rightarrow$ **Dave**, `4550¢`, `SUMMIT FUEL #12`.
   - **Format B (Card xXXXX charged $amount - Merchant):**  
     `SCCU ALERT - Card x2208 charged $1,200.00 - BEAR HOLLOW CABINS` $\rightarrow$ **Linda**, `120000¢`, `BEAR HOLLOW CABINS`.
   - **Format C (You spent $amount at Merchant with card XXXX. Available balance: $amount):**  
     `Switchback Credit Union: You spent $18 at TRAILHEAD PARKING with card 9031. Available balance: $2,340.12` $\rightarrow$ **Carol**, `1800¢`, `TRAILHEAD PARKING`.

2. **Awkward Cases Handled Correctly:**
   - **Comma thousands ($1,200.00):** Processed through `parseDollars()` into `120000` integer cents without truncation (avoiding the bug where `$1,200.00` becomes `$1.00` or `$1.20`).
   - **Missing cents ($18):** Processed through `parseDollars()` into `1800` integer cents.
   - **Secondary Amounts / Account Balance Ignored:** In Format C alerts containing `"Available balance: $2,340.12"`, the balance figure is ignored, and only the purchase amount (`$18`) is imported.
   - **Unknown Cardholders:** Alerts mentioning unlisted cards (e.g., `card ending 7777`) are never imported into the ledger; they are routed to "Needs review" with the explicit reason naming the card (`card 7777 is not on the card list`).
   - **Declined & Unreadable Transactions:** Alerts containing `"Declined"` or missing purchase amounts are routed to "Needs review" with a descriptive reason.
   - **Forwarded Prefixes:** Automated email/SMS forwarding prefixes such as `"Fwd:"` or `"FWD:"` are stripped cleanly before parsing.

3. **Core Invariants & Bookkeeping Principles:**
   - **No Silent Drops:** For any paste, `Total Non-Blank Lines = Imported Count + Needs Review Count`.
   - **Single Money Converter:** All dollar amounts pass strictly through `parseDollars()`. No floating-point math (`parseFloat(...) * 100`, `Math.trunc`, or `toFixed`) is used.
   - **Exact Cents Split:** Leftover cents from division are awarded one-by-one to roster members in order (Linda, then Dave, then Carol), ensuring sum of shares equals total cost to the exact penny.
   - **Full Backward Compatibility:** The 5 demo messages from class continue to produce exactly 4 expenses totaling `$1,343.60` plus 1 flagged review item. All 15 original baseline checks pass unchanged.

4. **Club Card Directory:**
   - `2208` = Linda
   - `4417` = Dave
   - `9031` = Carol
   - `5150` = Ray

---

## 3. What Does Not Work Yet (Honest Limitations)

1. **Foreign Currencies:** The importer currently assumes USD currency symbol (`$`) or standard dollar formats. Currency symbols like `€`, `£`, or `¥` are not yet supported and will be routed to "Needs review".
2. **Refunds & Chargebacks:** Negative credit transactions (e.g., `"SCCU ALERT: Refund of $25.00 from REI"`) are not yet converted into ledger credits; they currently flag under "Needs review" to prevent erroneous debit entries.
3. **Split SMS Messages:** If an alert is split into multiple separate text messages by the carrier (e.g., line 1: `"Switchback CU Alert"`, line 2: `"Card 4417 charged $20"`), they must be combined onto a single line before pasting.

---

## 4. Honest AI-Use Notes

- **AI Tools Used:** Google Antigravity 2.0 (Claude 3.7 Sonnet / Gemini 2.5 Pro agents).
- **Process Followed (Session 2 Discipline):**
  1. **Specification First:** Before touching any implementation code, `examples/card_alerts.md` was drafted with 7 concrete examples covering Formats A, B, and C plus deliberately chosen awkward cases (comma thousands, missing cents, unknown card 7777, declined alert, forwarded prefix).
  2. **Tests Before Code (Red):** One automated test per example was added to `tests.js` while keeping `importer.js` unchanged. Ran the tests to observe and capture the failing red test run (`tests_red.png` showing 6 failing checks and the 15 passing baseline checks).
  3. **Implementation (Green):** Extended `importer.js` to implement regex patterns, card directory lookups, prefix trimming, and error handling using the canonical `parseDollars()`. Re-ran the tests to confirm all 22 checks passing (`tests_green.png`).
  4. **Rule Definition in AGENTS.md:** Added Rule 5 to `AGENTS.md` and updated Rule 2 to reference `examples/card_alerts.md`. Verified in `memory_check.md` that a fresh agent conversation follows the new rule without prompting.
  5. **UI & User Experience:** Integrated live preview with count/total badges and a dedicated "Needs review" list into `index.html` and `app.js`, then verified visually (`import_preview.png`).
  6. **Git Save Points:** Made discrete git commits at each checkpoint (baseline, red tests, green code, rules and documentation).
- **What Went Wrong & How It Was Resolved:**
  - *Awkward Case with Balance:* In Format C alerts, the bank message contained two amounts (`$18` purchase and `$2,340.12` available balance). An early naive regex matching `\$[0-9.]+` captured the available balance instead of the purchase amount. Writing the explicit specification in `examples/card_alerts.md` and writing the failing test first immediately caught this, prompting a targeted regex that extracts the dollar amount specifically following `"You spent"`.
  - *Unknown Card Naming Requirement:* The assignment requires the review reason to explicitly name the card (`"card 7777 is not on the card list"`). The test verified this exact string requirement, ensuring clear feedback for the treasurer.

---

## 5. Deliverables Checklist

- [x] `fairshare/`: Complete runnable project (`index.html`, `importer.js`, `tests.js`, `tests.html`, `money.js`, `app.js`, `style.css`, `AGENTS.md`, `examples/`).
- [x] `fairshare/examples/card_alerts.md`: 7 examples covering 3 formats and awkward cases.
- [x] `tests_red.png`: Screenshot showing the card alert tests failing (red) before code implementation.
- [x] `tests_green.png`: Screenshot showing all 22 tests passing (green) after implementation.
- [x] `import_preview.png`: Screenshot showing mixed paste preview, count, total, and "Needs review" list.
- [x] `sample_alerts.txt`: Fictional mixed paste lines used for verification.
- [x] `memory_check.md`: Verification of new rule execution in a fresh conversation.
- [x] `git_log.txt`: Output of `git log --oneline` with 5 clear commits telling the project story.
- [x] `README.md`: Student documentation, instructions, feature audit, and AI-use notes.
