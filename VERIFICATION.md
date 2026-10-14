# Verification — 14 October 2026

## Completed checks

- **10,230 assertions passed** in `node tests/checks.cjs`. These cover the complete toy group (closure, identity, inverses, commutativity and associativity), scalar-multiplication methods, selected statistical invariants, all 24 English BIP-39 reference vectors, the six derivation paths in BIP-32 test vector 1, eight official EIP-55 examples, independent Node.js hash/PBKDF2 comparisons, and local navigation/assets.
- **30 DOM interaction checks passed** using jsdom 26.1.0. These include invalid inputs, infinity, an order-2 subgroup, timed replay, reset, checksum mutation, alternate test phrases, a 64-observation statistical run, and CSV download actions.
- The six reference self-checks displayed on HW2 all pass.

## Reproduce

The core checks require only Node.js 18 or later:

```sh
node tests/checks.cjs
```

Optional DOM interaction checks:

```sh
npm install
npm run test:ui
```

The website itself does not require npm, jsdom, a build, or any remote library.

## Verification limits

DOM tests simulate page interactions; they do not render page layout. A visual inspection in a real browser at desktop and mobile widths has **not** been completed in this environment. Responsive CSS and print rules are provided, but their rendering remains unverified. The site is not yet published on GitHub Pages. No manual wallet-application comparison or cryptographic audit is claimed.

The number of assertions reflects exhaustive toy input combinations, not independent security experiments. Passing them does not prove the cryptographic security of a library or the statistical independence of its outputs.
