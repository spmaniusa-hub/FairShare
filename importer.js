/**
 * importer.js - Text message expense importer for FairShare (Checkpoint 2 Baseline).
 *
 * Standing Orders (AGENTS.md):
 * 1. Single money converter: parseDollars() is canonical.
 * 2. Whole integer cents everywhere.
 * 3. No silent drops: Every non-blank line is either imported or flagged under needsReview.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FairShareImporter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Recognized club members
  const MEMBERS = ['Linda', 'Dave', 'Carol', 'Ray'];

  /**
   * Single canonical converter from dollar text to integer cents.
   * Handles formats: "$100", "100", "$45.50", "$1,200.00", "$18", "0.05".
   *
   * @param {string} str
   * @returns {number} Integer cents
   * @throws {Error} if invalid format or non-positive
   */
  function parseDollars(str) {
    if (!str || typeof str !== 'string') {
      throw new Error('Invalid dollar string: input must be a non-empty string');
    }

    let cleaned = str.trim().replace(/^\$/, '').replace(/,/g, '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
      throw new Error('Invalid dollar amount format: ' + str);
    }

    const parts = cleaned.split('.');
    const dollars = parseInt(parts[0], 10);
    let cents = 0;

    if (parts.length > 1) {
      if (parts[1].length === 1) {
        cents = parseInt(parts[1], 10) * 10;
      } else {
        cents = parseInt(parts[1].slice(0, 2), 10);
      }
    }

    const totalCents = dollars * 100 + cents;
    if (totalCents <= 0) {
      throw new Error('Amount must be positive: ' + str);
    }

    return totalCents;
  }

  /**
   * Parse a single casual text message line into an expense record or needsReview object.
   *
   * @param {string} rawLine
   * @returns {object|null}
   */
  function parseMessage(rawLine) {
    if (!rawLine || typeof rawLine !== 'string' || !rawLine.trim()) {
      return null;
    }

    const line = rawLine.trim();

    // 1. Look for dollar amount
    const amountMatch = line.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
    if (!amountMatch) {
      return {
        success: false,
        raw: line,
        reason: 'no recognizable amount found'
      };
    }

    let cents;
    try {
      cents = parseDollars(amountMatch[0]);
    } catch (e) {
      return {
        success: false,
        raw: line,
        reason: 'invalid amount format: ' + amountMatch[0]
      };
    }

    // 2. Identify payer from recognized members
    let foundMember = null;
    for (const member of MEMBERS) {
      const regex = new RegExp('\\b' + member + '\\b', 'i');
      if (regex.test(line)) {
        foundMember = member;
        break;
      }
    }

    if (!foundMember) {
      return {
        success: false,
        raw: line,
        reason: 'no recognizable payer found'
      };
    }

    // 3. Extract description
    let desc = line
      .replace(new RegExp('\\b' + foundMember + '\\b', 'gi'), '')
      .replace(amountMatch[0], '')
      .replace(/\bpaid\b/gi, '')
      .replace(/[.,;:]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    desc = desc.replace(/^(for|at)\s+/i, '').trim();
    if (!desc) {
      desc = 'Expense';
    }

    return {
      success: true,
      paidBy: foundMember,
      cents: cents,
      desc: desc,
      raw: line
    };
  }

  /**
   * Parse multiple text lines into parsed items and needsReview items.
   *
   * @param {string} text
   * @returns {object}
   */
  function parseMessages(text) {
    if (!text || typeof text !== 'string') {
      return { items: [], needsReview: [], count: 0, totalCents: 0 };
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items = [];
    const needsReview = [];
    let totalCents = 0;

    for (const line of lines) {
      const res = parseMessage(line);
      if (!res) continue;

      if (res.success) {
        items.push({
          paidBy: res.paidBy,
          cents: res.cents,
          desc: res.desc,
          raw: res.raw
        });
        totalCents += res.cents;
      } else {
        needsReview.push({
          raw: res.raw,
          reason: res.reason
        });
      }
    }

    return {
      items: items,
      needsReview: needsReview,
      count: items.length,
      totalCents: totalCents
    };
  }

  return {
    parseDollars: parseDollars,
    parseMessage: parseMessage,
    parseMessages: parseMessages,
    MEMBERS: MEMBERS
  };
}));
