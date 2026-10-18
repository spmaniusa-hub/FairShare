/**
 * tests.js - Test suite for FairShare Text Message Importer (Checkpoint 2 Baseline).
 * Contains 15 automated test checks verifying whole-cent money conversion and text parsing.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./importer.js'));
  } else {
    factory(root.MoneyMath, root.FairShareImporter);
  }
}(typeof self !== 'undefined' ? self : this, function (MoneyMath, Importer) {
  'use strict';

  const suiteList = (typeof window !== 'undefined' && window.testSuites) ? window.testSuites : [];

  function registerSuite(name, fn) {
    if (typeof window !== 'undefined' && typeof window.suite === 'function') {
      window.suite(name, fn);
    } else {
      suiteList.push({ name: name, fn: fn });
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error((message ? message + ': ' : '') + 'Expected [' + expected + '] but got [' + actual + ']');
    }
  }

  // =========================================================================
  // Baseline Suite 1: Canonical parseDollars() Verification (6 Checks)
  // =========================================================================

  registerSuite('parseDollars(): Whole Cent Conversion (AGENTS.md Single Converter)', function (add) {
    add('1. Converts whole dollar amounts ("$100" -> 10000 cents)', function () {
      assertEqual(Importer.parseDollars('$100'), 10000, '$100 converts to 10000 cents');
      assertEqual(Importer.parseDollars('100'), 10000, '100 without symbol converts to 10000 cents');
    });

    add('2. Converts standard cents amounts ("$45.50" -> 4550 cents)', function () {
      assertEqual(Importer.parseDollars('$45.50'), 4550, '$45.50 converts to 4550 cents');
    });

    add('3. Converts comma thousands without truncation ("$1,200.00" -> 120000 cents)', function () {
      // Linda cabin deposit test: verifies the comma does not truncate 1,200 into 1
      assertEqual(Importer.parseDollars('$1,200.00'), 120000, '$1,200.00 converts to 120000 cents');
    });

    add('4. Converts missing cents ("$18" -> 1800 cents)', function () {
      assertEqual(Importer.parseDollars('$18'), 1800, '$18 converts to 1800 cents');
    });

    add('5. Converts small cent amounts ("0.05" -> 5 cents, "0.99" -> 99 cents)', function () {
      assertEqual(Importer.parseDollars('0.05'), 5, '0.05 converts to 5 cents');
      assertEqual(Importer.parseDollars('$0.99'), 99, '$0.99 converts to 99 cents');
    });

    add('6. Rejects zero, negative, or invalid non-numeric strings', function () {
      let threw = false;
      try { Importer.parseDollars('$0'); } catch (e) { threw = true; }
      assert(threw, 'Rejected $0');

      threw = false;
      try { Importer.parseDollars('-50'); } catch (e) { threw = true; }
      assert(threw, 'Rejected negative amount');

      threw = false;
      try { Importer.parseDollars('abc'); } catch (e) { threw = true; }
      assert(threw, 'Rejected non-numeric letters');
    });
  });

  // =========================================================================
  // Baseline Suite 2: Single Message parseMessage() (5 Checks)
  // =========================================================================

  registerSuite('parseMessage(): Free-Text Message Parsing (Class Examples)', function (add) {
    add('7. Parses Dave fuel message ("Dave paid $45.50 for gas")', function () {
      const res = Importer.parseMessage('Dave paid $45.50 for gas');
      assert(res && res.success, 'Parsing succeeded');
      assertEqual(res.paidBy, 'Dave', 'Payer is Dave');
      assertEqual(res.cents, 4550, 'Amount is 4550 cents');
      assertEqual(res.desc, 'gas', 'Description is gas');
    });

    add('8. Parses Carol trailhead parking ("Carol $18 parking at trailhead")', function () {
      const res = Importer.parseMessage('Carol $18 parking at trailhead');
      assert(res && res.success, 'Parsing succeeded');
      assertEqual(res.paidBy, 'Carol', 'Payer is Carol');
      assertEqual(res.cents, 1800, 'Amount is 1800 cents ($18.00)');
      assert(res.desc.includes('parking'), 'Description contains parking');
    });

    add('9. Parses Ray trailing name ("$80.10 coffee and bagels. Ray")', function () {
      const res = Importer.parseMessage('$80.10 coffee and bagels. Ray');
      assert(res && res.success, 'Parsing succeeded');
      assertEqual(res.paidBy, 'Ray', 'Payer is Ray');
      assertEqual(res.cents, 8010, 'Amount is 8010 cents ($80.10)');
      assert(res.desc.includes('coffee and bagels'), 'Description contains coffee and bagels');
    });

    add('10. Parses Linda cabin deposit with comma ("Linda paid $1,200 for the cabin deposit")', function () {
      const res = Importer.parseMessage('Linda paid $1,200 for the cabin deposit');
      assert(res && res.success, 'Parsing succeeded');
      assertEqual(res.paidBy, 'Linda', 'Payer is Linda');
      assertEqual(res.cents, 120000, 'Amount is 120000 cents ($1,200.00)');
      assert(res.desc.includes('cabin deposit'), 'Description contains cabin deposit');
    });

    add('11. Flags message with no amount under Needs Review ("Can someone pick up ice?")', function () {
      const res = Importer.parseMessage('Can someone pick up ice?');
      assert(res && !res.success, 'Flagged as review required');
      assert(res.reason, 'Contains descriptive failure reason');
    });
  });

  // =========================================================================
  // Baseline Suite 3: Batch parseMessages() Invariants (4 Checks)
  // =========================================================================

  registerSuite('parseMessages(): Batch Invariants & Class Demo Validation', function (add) {
    const rawDemo = [
      'Dave paid $45.50 for gas',
      'Carol $18 parking at trailhead',
      '$80.10 coffee and bagels. Ray',
      'Linda paid $1,200 for the cabin deposit',
      'Can someone pick up ice?'
    ].join('\n');

    add('12. Splits 5 demo messages into 4 imported expenses and 1 flagged line', function () {
      const batch = Importer.parseMessages(rawDemo);
      assertEqual(batch.items.length, 4, 'Exactly 4 expenses imported');
      assertEqual(batch.needsReview.length, 1, 'Exactly 1 line flagged under Needs Review');
    });

    add('13. Batch computes exact total $1,343.60 (134360 cents) for 4 demo expenses', function () {
      const batch = Importer.parseMessages(rawDemo);
      // $45.50 + $18.00 + $80.10 + $1,200.00 = $1,343.60 (134360 cents)
      assertEqual(batch.totalCents, 134360, 'Total equals exactly 134360 cents ($1,343.60)');
    });

    add('14. Invariant: Total non-blank lines = Imported Count + Flagged Count (4 + 1 = 5)', function () {
      const batch = Importer.parseMessages(rawDemo);
      assertEqual(batch.count + batch.needsReview.length, 5, 'Sum of imported and flagged equals 5 lines');
    });

    add('15. Ignores blank lines and whitespace padding without failing', function () {
      const withSpaces = '\n  \nDave paid $45.50 for gas\n\n\nCarol $18 parking at trailhead\n  \n';
      const batch = Importer.parseMessages(withSpaces);
      assertEqual(batch.items.length, 2, 'Parsed 2 non-blank items');
      assertEqual(batch.needsReview.length, 0, 'Zero flagged review items');
    });
  });

  // Runner for Node.js CLI execution
  if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('tests.js')) {
    console.log('Running 15 Baseline Tests in tests.js...\n');
    let passCount = 0;
    let failCount = 0;
    for (const s of suiteList) {
      console.log('--- ' + s.name + ' ---');
      s.fn(function (testName, testFn) {
        try {
          testFn();
          console.log('  [PASS] ' + testName);
          passCount++;
        } catch (err) {
          console.log('  [FAIL] ' + testName + ' -> ' + err.message);
          failCount++;
        }
      });
    }
    console.log('\nResult: ' + passCount + ' passed, ' + failCount + ' failed.');
    if (failCount > 0) process.exit(1);
  }

  return { suiteList: suiteList };
}));
