/**
 * money.js - Complete money & currency arithmetic for FairShare.
 *
 * Core Bookkeeping Principles:
 * 1. All monetary values are strictly stored and computed as integer cents.
 * 2. Leftover cents from division are awarded one-by-one to the first listed participants.
 * 3. Exact sum invariant: The sum of individual shares must always match the total to the penny.
 * 4. Zero-sum invariant: The sum of all net balances across participants must always equal 0.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MoneyMath = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_PARTICIPANTS = ['Linda', 'Dave', 'Carol'];

  /**
   * Parse user currency input into integer cents.
   * Handles formats like "$100", "100", "100.5", "100.50", "1,250.75".
   *
   * @param {string|number} input
   * @returns {number} Integer cents
   * @throws {Error} If input is invalid, negative, or zero
   */
  function dollarsToCents(input) {
    if (input === null || input === undefined) {
      throw new Error('Please enter an amount.');
    }

    let str = String(input).trim();
    if (!str) {
      throw new Error('Please enter an amount.');
    }

    // Strip currency symbol and commas
    str = str.replace(/^\$/, '').replace(/,/g, '').trim();

    // Check valid decimal format: e.g. 100, 100.5, 100.50
    if (!/^\d+(\.\d{1,2})?$/.test(str)) {
      throw new Error('Please enter a valid amount (e.g. 100 or 33.50).');
    }

    const parts = str.split('.');
    const dollars = parseInt(parts[0], 10);
    let cents = 0;

    if (parts.length > 1) {
      const dec = parts[1];
      if (dec.length === 1) {
        cents = parseInt(dec, 10) * 10;
      } else {
        cents = parseInt(dec.slice(0, 2), 10);
      }
    }

    const totalCents = dollars * 100 + cents;
    if (totalCents <= 0) {
      throw new Error('Expense amount must be greater than $0.00.');
    }
    if (!Number.isSafeInteger(totalCents)) {
      throw new Error('Amount is too large to process safely.');
    }

    return totalCents;
  }

  /**
   * Format integer cents into standard USD string (e.g. 10000 -> "$100.00").
   *
   * @param {number} cents Integer cents
   * @param {Object} [options]
   * @param {boolean} [options.includeSign=false] Include '+' for positive values
   * @param {boolean} [options.absolute=false] Format absolute value only
   * @returns {string} Formatted currency string
   */
  function centsToDollars(cents, options = {}) {
    if (typeof cents !== 'number' || isNaN(cents)) {
      return '$0.00';
    }

    const isNegative = cents < 0;
    const absCents = Math.abs(Math.round(cents));
    const dollars = Math.floor(absCents / 100);
    const remCents = absCents % 100;
    const formattedCents = remCents < 10 ? '0' + remCents : String(remCents);
    const formattedNumber = `${dollars.toLocaleString('en-US')}.${formattedCents}`;

    if (options.absolute) {
      return `$${formattedNumber}`;
    }

    if (isNegative) {
      return `-$${formattedNumber}`;
    }

    if (options.includeSign && cents > 0) {
      return `+$${formattedNumber}`;
    }

    return `$${formattedNumber}`;
  }

  /**
   * Split an amount in integer cents evenly among a given number of people.
   * Any leftover cents are allocated to the first people listed (index 0, 1, ...).
   *
   * @param {number} totalCents Total amount in whole cents
   * @param {number} numPeople Number of people sharing the expense
   * @returns {number[]} Array of integer cents for each person
   */
  function splitCents(totalCents, numPeople) {
    if (!Number.isInteger(totalCents) || totalCents < 0) {
      throw new Error('Total cents must be a non-negative integer.');
    }
    if (!Number.isInteger(numPeople) || numPeople <= 0) {
      throw new Error('Number of people must be a positive integer.');
    }

    const baseShare = Math.floor(totalCents / numPeople);
    const remainder = totalCents % numPeople;
    const shares = new Array(numPeople);

    for (let i = 0; i < numPeople; i++) {
      shares[i] = baseShare + (i < remainder ? 1 : 0);
    }

    return shares;
  }

  /**
   * Split an expense among named participants.
   *
   * @param {number} amountCents Expense amount in cents
   * @param {string[]} [participants=DEFAULT_PARTICIPANTS] Ordered list of participants
   * @returns {Object.<string, number>} Map of participant name -> share in cents
   */
  function splitExpense(amountCents, participants = DEFAULT_PARTICIPANTS) {
    const shares = splitCents(amountCents, participants.length);
    const result = {};
    for (let i = 0; i < participants.length; i++) {
      result[participants[i]] = shares[i];
    }
    return result;
  }

  /**
   * Compute comprehensive ledger balances across all expenses.
   *
   * @param {Array<{id: string, what: string, amountCents: number, paidBy: string}>} expenses
   * @param {string[]} [participants=DEFAULT_PARTICIPANTS]
   * @returns {Object} Ledger calculation results
   */
  function calculateLedger(expenses = [], participants = DEFAULT_PARTICIPANTS) {
    const balances = {};
    for (const name of participants) {
      balances[name] = {
        name,
        paidCents: 0,
        shareCents: 0,
        netCents: 0,
        status: 'settled' // 'gets_back' | 'owes' | 'settled'
      };
    }

    let totalTripCents = 0;
    const enrichedExpenses = expenses.map(expense => {
      const shares = splitExpense(expense.amountCents, participants);
      totalTripCents += expense.amountCents;

      // Accumulate paid amount
      if (balances[expense.paidBy]) {
        balances[expense.paidBy].paidCents += expense.amountCents;
      }

      // Accumulate share amount
      for (const name of participants) {
        balances[name].shareCents += shares[name];
      }

      return {
        ...expense,
        shares
      };
    });

    // Compute net balance for each person
    const balanceList = participants.map(name => {
      const person = balances[name];
      person.netCents = person.paidCents - person.shareCents;

      if (person.netCents > 0) {
        person.status = 'gets_back';
      } else if (person.netCents < 0) {
        person.status = 'owes';
      } else {
        person.status = 'settled';
      }
      return person;
    });

    // Calculate simplified debt settlement transactions
    const settlements = calculateSettlements(balanceList);

    return {
      totalTripCents,
      balances: balanceList,
      balancesByName: balances,
      settlements,
      expenses: enrichedExpenses
    };
  }

  /**
   * Calculate minimal settlement transactions to settle all debts.
   *
   * @param {Array<{name: string, netCents: number}>} balances
   * @returns {Array<{from: string, to: string, amountCents: number}>} List of payments
   */
  function calculateSettlements(balances) {
    // Clone debtors and creditors
    const debtors = [];
    const creditors = [];

    for (const b of balances) {
      if (b.netCents < 0) {
        debtors.push({ name: b.name, owedCents: Math.abs(b.netCents) });
      } else if (b.netCents > 0) {
        creditors.push({ name: b.name, creditCents: b.netCents });
      }
    }

    // Sort descending by amount to resolve largest debts first
    debtors.sort((a, b) => b.owedCents - a.owedCents);
    creditors.sort((a, b) => b.creditCents - a.creditCents);

    const transactions = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      const payment = Math.min(debtor.owedCents, creditor.creditCents);

      if (payment > 0) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amountCents: payment
        });
      }

      debtor.owedCents -= payment;
      creditor.creditCents -= payment;

      if (debtor.owedCents === 0) d++;
      if (creditor.creditCents === 0) c++;
    }

    return transactions;
  }

  return {
    DEFAULT_PARTICIPANTS,
    dollarsToCents,
    centsToDollars,
    splitCents,
    splitExpense,
    calculateLedger,
    calculateSettlements
  };
}));
