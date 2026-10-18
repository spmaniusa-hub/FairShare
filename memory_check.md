# New Conversation Rule Check (memory_check.md)

This document records the verification check performed to ensure an AI assistant in a clean conversation automatically discovers and obeys the newly added rules in `AGENTS.md` without being reminded.

---

## 1. The Rule Under Test

From `AGENTS.md`:
> **Rule 5: Card Alert Directory & Unknown Card Rule**
> - When parsing automated bank and card-alert texts (Switchback CU, SCCU, or card ending patterns), match the last 4 digits against the club card list:
>   - `2208` = Linda
>   - `4417` = Dave
>   - `9031` = Carol
>   - `5150` = Ray
> - If an alert mentions a card ending not in the card directory (e.g., card 7777), the importer MUST NOT import it and MUST flag it under "Needs review" with a reason explicitly naming the card: `"card <digits> is not on the card list"`.
> - If a card alert contains a secondary amount (such as `"Available balance: $2,340.12"`), ignore the balance and only parse the actual purchase/spent amount using `parseDollars()`.

---

## 2. The Prompt Asked in a Fresh Conversation

Without reminding the assistant about `AGENTS.md`, `examples/card_alerts.md`, or the card numbers, the following prompt was submitted:

```text
Please process the following raw bank alert for FairShare:

<alerts>
Switchback CU: Purchase of $22.50 at TRAILHEAD CAFE on card ending 8888.
</alerts>

How should FairShare handle this alert?
```

---

## 3. What the Agent Did (Observed Output)

The agent inspected the repository configuration, read `AGENTS.md` and `examples/card_alerts.md`, and answered:

1. **Rule Discovery:** The agent immediately cited **Rule 5** and **Rule 4** from `AGENTS.md`.
2. **Card List Lookup:** It compared `8888` against the active club card directory:
   - `2208` $\rightarrow$ Linda
   - `4417` $\rightarrow$ Dave
   - `9031` $\rightarrow$ Carol
   - `5150` $\rightarrow$ Ray
3. **Correct Behavior:** Because `8888` was not found in the directory, the agent stated:
   - The transaction **must NOT** be imported into the ledger.
   - It **must** be placed in the `"Needs review"` list.
   - The review reason **must explicitly name the card**: `"card 8888 is not on the card list"`.
4. **Invariant Maintained:** The agent verified the non-silent drop invariant: 1 non-blank line submitted = 0 imported + 1 flagged under Needs Review.
5. **Money Converter Integrity:** It noted that if the card were registered later, the amount `$22.50` would be parsed exclusively through `parseDollars()` to yield `2250` integer cents.

### Verdict
✅ **PASSED.** The agent followed the new `AGENTS.md` rules without any manual prompting or hints.
