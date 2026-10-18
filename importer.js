/**
 * importer.js - Text message and card alert expense importer for FairShare.
 *
 * Standing Orders (AGENTS.md):
 * 1. Single money converter: parseDollars() is canonical.
 * 2. Whole integer cents everywhere.
 * 3. No silent drops: Every non-blank line is either imported or flagged under needsReview.
 * 4. Card directory mapping for automated SMS alerts.
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

  // Default card directory mapping 4-digit card endings to members
  const DEFAULT_CARD_DIRECTORY = {
    '2208': 'Linda',
    '4417': 'Dave',
    '9031': 'Carol',
    '5150': 'Ray'
  };

  let activeCardDirectory = Object.assign({}, DEFAULT_CARD_DIRECTORY);

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
   * Helper to detect whether a line represents an automated bank / credit union card alert.
   *
   * @param {string} line
   * @returns {boolean}
   */
  function isCardAlertLine(line) {
    return /switchback/i.test(line) ||
           /\bsccu\b/i.test(line) ||
           /\bcard\s+(?:ending\s+|x)?\d{4}\b/i.test(line) ||
           /\bwith card\s+\d{4}\b/i.test(line);
  }

  /**
   * Parse an automated bank card alert SMS line.
   *
   * Formats handled:
   * - Format A: "Switchback CU: Purchase of $45.50 at SUMMIT FUEL #12 on card ending 4417."
   * - Format B: "SCCU ALERT - Card x2208 charged $1,200.00 - BEAR HOLLOW CABINS"
   * - Format C: "Switchback Credit Union: You spent $18 at TRAILHEAD PARKING with card 9031. Available balance: $2,340.12"
   *
   * @param {string} rawLine
   * @param {object} [cardMap]
   * @returns {object} Result object with success, paidBy, cents, desc, raw, or reason
   */
  function parseCardAlert(rawLine, cardMap) {
    const cards = cardMap || activeCardDirectory;
    let line = rawLine.trim();

    // Strip forwarded text/email prefixes (e.g., "Fwd:", "FWD:", "Fw:")
    line = line.replace(/^(?:fwd|fw):\s*/i, '').trim();

    // Awkward case: Declined / Attempted transactions
    if (/\bdeclined\b/i.test(line) || /\battempted\b/i.test(line)) {
      return {
        success: false,
        raw: rawLine,
        reason: 'declined transaction or unreadable card alert'
      };
    }

    let parsedCard = null;
    let parsedAmountStr = null;
    let parsedDesc = null;

    // --- Format A ---
    // Example: "Switchback CU: Purchase of $45.50 at SUMMIT FUEL #12 on card ending 4417."
    const formatAMatch = line.match(/Purchase of\s+(\$?[0-9,]+(?:\.[0-9]{1,2})?)\s+at\s+(.+?)\s+on card ending\s+(\d{4})/i);
    if (formatAMatch) {
      parsedAmountStr = formatAMatch[1];
      parsedDesc = formatAMatch[2].trim();
      parsedCard = formatAMatch[3];
    }

    // --- Format B ---
    // Example: "SCCU ALERT - Card x2208 charged $1,200.00 - BEAR HOLLOW CABINS"
    if (!parsedCard) {
      const formatBMatch = line.match(/Card\s+x?(\d{4})\s+charged\s+(\$?[0-9,]+(?:\.[0-9]{1,2})?)\s*-\s*(.+)/i);
      if (formatBMatch) {
        parsedCard = formatBMatch[1];
        parsedAmountStr = formatBMatch[2];
        parsedDesc = formatBMatch[3].trim();
      }
    }

    // --- Format C ---
    // Example: "Switchback Credit Union: You spent $18 at TRAILHEAD PARKING with card 9031. Available balance: $2,340.12"
    if (!parsedCard) {
      const formatCMatch = line.match(/You spent\s+(\$?[0-9,]+(?:\.[0-9]{1,2})?)\s+at\s+(.+?)\s+with card\s+(\d{4})/i);
      if (formatCMatch) {
        parsedAmountStr = formatCMatch[1];
        parsedDesc = formatCMatch[2].trim();
        parsedCard = formatCMatch[3];
      }
    }

    // If an alert was matched into structured fields
    if (parsedCard && parsedAmountStr) {
      // Validate card against card directory
      const member = cards[parsedCard];
      if (!member) {
        return {
          success: false,
          raw: rawLine,
          reason: `card ${parsedCard} is not on the card list`
        };
      }

      // Convert amount using canonical parseDollars()
      let cents;
      try {
        cents = parseDollars(parsedAmountStr);
      } catch (err) {
        return {
          success: false,
          raw: rawLine,
          reason: 'invalid amount format: ' + parsedAmountStr
        };
      }

      // Clean trailing punctuation on description
      parsedDesc = (parsedDesc || 'Card Expense').replace(/[.,;:]+$/, '').trim();

      return {
        success: true,
        paidBy: member,
        cents: cents,
        desc: parsedDesc,
        card: parsedCard,
        raw: rawLine
      };
    }

    // Awkward case: Line has a card ending, but format doesn't match standard patterns
    const genericCardMatch = line.match(/(?:card ending|card x|with card|card)\s*x?(\d{4})/i);
    if (genericCardMatch) {
      const cardDigits = genericCardMatch[1];
      if (!cards[cardDigits]) {
        return {
          success: false,
          raw: rawLine,
          reason: `card ${cardDigits} is not on the card list`
        };
      }
    }

    return {
      success: false,
      raw: rawLine,
      reason: 'unrecognized card alert format'
    };
  }

  /**
   * Parse a single line (either casual text message or bank alert SMS).
   *
   * @param {string} rawLine
   * @param {object} [cardMap]
   * @returns {object|null}
   */
  function parseMessage(rawLine, cardMap) {
    if (!rawLine || typeof rawLine !== 'string' || !rawLine.trim()) {
      return null;
    }

    const line = rawLine.trim();

    // Check if this is an automated card alert
    if (isCardAlertLine(line)) {
      return parseCardAlert(line, cardMap);
    }

    // Otherwise, treat as casual peer text message
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
   * Supports optional duplicate detection and custom card directories.
   *
   * @param {string} text
   * @param {object} [options] { cards, detectDuplicates }
   * @returns {object} { items, needsReview, count, totalCents }
   */
  function parseMessages(text, options) {
    if (!text || typeof text !== 'string') {
      return { items: [], needsReview: [], count: 0, totalCents: 0 };
    }

    const opts = options || {};
    const cardMap = opts.cards || activeCardDirectory;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const items = [];
    const needsReview = [];
    const seenLines = new Set();
    let totalCents = 0;

    for (const line of lines) {
      // Bonus duplicate detection if enabled
      if (opts.detectDuplicates && seenLines.has(line)) {
        needsReview.push({
          raw: line,
          reason: 'possible duplicate'
        });
        continue;
      }
      seenLines.add(line);

      const res = parseMessage(line, cardMap);
      if (!res) continue;

      if (res.success) {
        items.push({
          paidBy: res.paidBy,
          cents: res.cents,
          desc: res.desc,
          card: res.card || null,
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

  /**
   * Card directory helpers (Bonus challenge: editable card list)
   */
  function getCardDirectory() {
    return Object.assign({}, activeCardDirectory);
  }

  function setCardDirectory(newMap) {
    if (newMap && typeof newMap === 'object') {
      activeCardDirectory = Object.assign({}, newMap);
    }
  }

  function addCard(digits, memberName) {
    if (digits && memberName) {
      activeCardDirectory[String(digits).trim()] = String(memberName).trim();
    }
  }

  function resetCardDirectory() {
    activeCardDirectory = Object.assign({}, DEFAULT_CARD_DIRECTORY);
  }

  return {
    parseDollars: parseDollars,
    parseMessage: parseMessage,
    parseMessages: parseMessages,
    MEMBERS: MEMBERS,
    DEFAULT_CARD_DIRECTORY: DEFAULT_CARD_DIRECTORY,
    getCardDirectory: getCardDirectory,
    setCardDirectory: setCardDirectory,
    addCard: addCard,
    resetCardDirectory: resetCardDirectory
  };
}));
