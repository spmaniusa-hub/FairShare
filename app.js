/**
 * app.js - UI controller and DOM interactions for FairShare.
 * Uses MoneyMath from money.js for all monetary calculations.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'fairshare_trip_expenses_v1';
  const PARTICIPANTS = MoneyMath.DEFAULT_PARTICIPANTS; // ['Linda', 'Dave', 'Carol']

  // Initial seed data showcasing the prompt's exact $100 dinner example
  const INITIAL_SEED = [
    {
      id: 'seed-dinner-100',
      what: 'Dinner',
      amountCents: 10000,
      paidBy: 'Linda',
      timestamp: Date.now()
    }
  ];

  // Application State
  let expenses = loadExpenses();

  // DOM Elements
  const balancesContainer = document.getElementById('balances-container');
  const settlementList = document.getElementById('settlement-list');
  const settlementFooter = document.getElementById('settlement-footer');
  const btnCopySettlement = document.getElementById('btn-copy-settlement');
  const ledgerBody = document.getElementById('ledger-body');
  const ledgerCountLabel = document.getElementById('ledger-count-label');
  const tripTotalSummary = document.getElementById('trip-total-summary');
  const footerTotalAmount = document.getElementById('footer-total-amount');
  const expenseForm = document.getElementById('expense-form');
  const whatInput = document.getElementById('expense-what');
  const amountInput = document.getElementById('expense-amount');
  const paidBySelect = document.getElementById('expense-paidby');
  const formError = document.getElementById('form-error');
  const btnClearAll = document.getElementById('btn-clear-all');

  /**
   * Load expenses from localStorage or return initial seed.
   */
  function loadExpenses() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return [...INITIAL_SEED];
  }

  /**
   * Save current expenses to localStorage.
   */
  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  }

  /**
   * Display an error message in the form banner.
   */
  function showError(msg) {
    if (!msg) {
      formError.textContent = '';
      formError.style.display = 'none';
      return;
    }
    formError.textContent = msg;
    formError.style.display = 'block';
  }

  /**
   * Main render function: re-calculates ledger and updates all UI sections.
   */
  function render() {
    const ledger = MoneyMath.calculateLedger(expenses, PARTICIPANTS);

    renderHeaderSummary(ledger);
    renderBalances(ledger);
    renderSettlements(ledger);
    renderLedger(ledger);
  }

  /**
   * Update header totals.
   */
  function renderHeaderSummary(ledger) {
    const totalFormatted = MoneyMath.centsToDollars(ledger.totalTripCents);
    tripTotalSummary.textContent = `Trip Total: ${totalFormatted}`;
    footerTotalAmount.textContent = totalFormatted;
    ledgerCountLabel.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} recorded`;
  }

  /**
   * Render individual participant cards showing who owes and who gets back.
   */
  function renderBalances(ledger) {
    balancesContainer.innerHTML = '';

    ledger.balances.forEach(person => {
      const card = document.createElement('div');
      card.className = `balance-card status-${person.status}`;

      let badgeHtml = '';
      let netDisplay = '';
      let amountClass = '';

      if (person.status === 'gets_back') {
        badgeHtml = `<span class="balance-badge badge-credit">Gets back</span>`;
        netDisplay = `+${MoneyMath.centsToDollars(person.netCents, { absolute: true })}`;
        amountClass = 'amount-credit';
      } else if (person.status === 'owes') {
        badgeHtml = `<span class="balance-badge badge-debt">Owes</span>`;
        netDisplay = `-${MoneyMath.centsToDollars(person.netCents, { absolute: true })}`;
        amountClass = 'amount-debt';
      } else {
        badgeHtml = `<span class="balance-badge badge-settled">Settled</span>`;
        netDisplay = '$0.00';
        amountClass = 'amount-settled';
      }

      card.innerHTML = `
        <div class="person-header">
          <span class="person-name">${escapeHtml(person.name)}</span>
          ${badgeHtml}
        </div>
        <div class="net-amount ${amountClass}">
          ${netDisplay}
        </div>
        <div class="balance-breakdown">
          <div class="breakdown-row">
            <span>Paid out of pocket:</span>
            <span class="breakdown-val">${MoneyMath.centsToDollars(person.paidCents)}</span>
          </div>
          <div class="breakdown-row">
            <span>Fair share (1/3):</span>
            <span class="breakdown-val">${MoneyMath.centsToDollars(person.shareCents)}</span>
          </div>
        </div>
      `;

      balancesContainer.appendChild(card);
    });
  }

  /**
   * Render simplified payment instructions to settle all balances.
   */
  function renderSettlements(ledger) {
    settlementList.innerHTML = '';

    if (ledger.settlements.length === 0) {
      settlementList.innerHTML = `
        <div class="settlement-empty">
          &check; All balances are fully settled! Nobody owes anything.
        </div>
      `;
      settlementFooter.style.display = 'none';
      return;
    }

    settlementFooter.style.display = 'flex';

    ledger.settlements.forEach(tx => {
      const item = document.createElement('div');
      item.className = 'settlement-item';
      item.innerHTML = `
        <div class="settlement-text">
          <span class="settlement-debtor">${escapeHtml(tx.from)}</span>
          <span>pays</span>
          <span class="settlement-creditor">${escapeHtml(tx.to)}</span>
        </div>
        <div class="settlement-amount">
          ${MoneyMath.centsToDollars(tx.amountCents)}
        </div>
      `;
      settlementList.appendChild(item);
    });
  }

  /**
   * Render itemized expenses in the table.
   */
  function renderLedger(ledger) {
    ledgerBody.innerHTML = '';

    if (ledger.expenses.length === 0) {
      ledgerBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-ledger">
            No expenses recorded yet. Use the form above to add your first expense!
          </td>
        </tr>
      `;
      return;
    }

    // Render in reverse chronological order (newest first)
    const reversed = [...ledger.expenses].reverse();

    reversed.forEach(exp => {
      const tr = document.createElement('tr');

      // Build 3-way split pills showing where remainder cents were allocated
      const splitPills = PARTICIPANTS.map((name, index) => {
        const shareVal = exp.shares[name];
        const formatted = MoneyMath.centsToDollars(shareVal);
        // Highlight recipient of extra cent if remainder existed
        const hasLeftover = (exp.amountCents % PARTICIPANTS.length) > 0 && index < (exp.amountCents % PARTICIPANTS.length);
        const pillClass = hasLeftover ? 'split-pill remainder-holder' : 'split-pill';
        const title = hasLeftover ? `${name} received a leftover cent` : `${name}'s share`;

        return `<span class="${pillClass}" title="${title}">${escapeHtml(name)}: ${formatted}</span>`;
      }).join(' ');

      tr.innerHTML = `
        <td class="col-what">${escapeHtml(exp.what)}</td>
        <td class="col-paidby">${escapeHtml(exp.paidBy)}</td>
        <td class="col-amount">${MoneyMath.centsToDollars(exp.amountCents)}</td>
        <td class="col-split">${splitPills}</td>
        <td class="col-action">
          <button type="button" class="btn-delete" data-id="${exp.id}" title="Delete this expense" aria-label="Delete ${escapeHtml(exp.what)}">
            &times; Delete
          </button>
        </td>
      `;

      ledgerBody.appendChild(tr);
    });
  }

  /**
   * Add a new expense.
   */
  function handleAddExpense(what, rawAmount, paidBy) {
    showError(null);

    const cleanWhat = (what || '').trim();
    if (!cleanWhat) {
      showError('Please describe what this expense was for (e.g. Dinner).');
      whatInput.focus();
      return false;
    }

    let cents;
    try {
      cents = MoneyMath.dollarsToCents(rawAmount);
    } catch (err) {
      showError(err.message);
      amountInput.focus();
      return false;
    }

    if (!PARTICIPANTS.includes(paidBy)) {
      showError('Please select who paid for this expense.');
      paidBySelect.focus();
      return false;
    }

    const newExpense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      what: cleanWhat,
      amountCents: cents,
      paidBy: paidBy,
      timestamp: Date.now()
    };

    expenses.push(newExpense);
    saveExpenses();
    render();

    // Reset inputs
    whatInput.value = '';
    amountInput.value = '';
    whatInput.focus();
    return true;
  }

  /**
   * Delete an expense by ID.
   */
  function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    saveExpenses();
    render();
  }

  /**
   * Clear all expenses.
   */
  function clearAllExpenses() {
    if (expenses.length === 0) return;
    const confirmed = window.confirm('Are you sure you want to clear all trip expenses from the ledger?');
    if (confirmed) {
      expenses = [];
      saveExpenses();
      render();
    }
  }

  /**
   * Copy human-readable settlement summary to clipboard.
   */
  function copySettlementSummary() {
    const ledger = MoneyMath.calculateLedger(expenses, PARTICIPANTS);

    let text = `FairShare Trip Ledger\n`;
    text += `Total Trip Cost: ${MoneyMath.centsToDollars(ledger.totalTripCents)}\n\n`;

    text += `Net Balances:\n`;
    ledger.balances.forEach(b => {
      const statusText = b.status === 'gets_back' ? 'Gets back' : (b.status === 'owes' ? 'Owes' : 'Settled');
      text += `• ${b.name}: ${statusText} ${MoneyMath.centsToDollars(b.netCents, { absolute: true })} (Paid: ${MoneyMath.centsToDollars(b.paidCents)}, Share: ${MoneyMath.centsToDollars(b.shareCents)})\n`;
    });

    text += `\nSettlement Instructions:\n`;
    if (ledger.settlements.length === 0) {
      text += `• All balances are settled! Nobody owes anything.\n`;
    } else {
      ledger.settlements.forEach(s => {
        text += `• ${s.from} pays ${s.to} ${MoneyMath.centsToDollars(s.amountCents)}\n`;
      });
    }

    navigator.clipboard.writeText(text).then(() => {
      const origText = btnCopySettlement.textContent;
      btnCopySettlement.textContent = '✓ Copied to Clipboard!';
      setTimeout(() => {
        btnCopySettlement.textContent = origText;
      }, 2200);
    }).catch(err => {
      console.warn('Clipboard write failed, displaying alert:', err);
      window.alert(text);
    });
  }

  /**
   * Helper: Escape HTML to avoid injection.
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- EVENT LISTENERS ---

  // Form submit
  expenseForm.addEventListener('submit', function (e) {
    e.preventDefault();
    handleAddExpense(whatInput.value, amountInput.value, paidBySelect.value);
  });

  // Table action clicks (Delete)
  ledgerBody.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-delete');
    if (btn) {
      const id = btn.getAttribute('data-id');
      if (id) {
        deleteExpense(id);
      }
    }
  });

  // Clear all
  btnClearAll.addEventListener('click', clearAllExpenses);

  // Copy settlement
  btnCopySettlement.addEventListener('click', copySettlementSummary);

  // Quick preset buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', function () {
      const what = this.getAttribute('data-what');
      const amount = this.getAttribute('data-amount');
      const paidBy = this.getAttribute('data-paidby');
      handleAddExpense(what, amount, paidBy);
    });
  });

  // Initial render on load
  document.addEventListener('DOMContentLoaded', render);
  // Also run immediately in case DOM is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    render();
  }
})();
