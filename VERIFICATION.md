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


## Lesson 2 — 22 October 2026

Added a single Lesson 2 entry page and preserved the original Lesson 1 URLs. The site remains static HTML/CSS/JavaScript and uses the existing vendored ethers 6.15.0 plus native Web Crypto. No new runtime dependency was added.

Validation performed:
- Existing suite: 10,234 arithmetic, wallet reference-vector, encoding and link checks passed.
- Existing DOM suite: 30 checks passed.
- Lesson 2 cryptographic/statistical suite: 362 checks passed. Includes independent Node crypto ECDH + HKDF + AES-GCM interoperability, Unicode round trip, fresh randomness, incorrect keys, modified ciphertext and public header fields, bounded search endpoints (including d=4,096), cancellation, out-of-range search, all 26 Caesar shifts, reproducibility and disjoint evaluation windows.
- Lesson 2 DOM suite: 15 interactions passed, including encryption, decryption, wrong keys, tampering with a verified baseline, recovered-key decryption, out-of-bound search, experiments, validation and three exports.
- All 50 local HTML references resolve; new JavaScript passes syntax checks.
- Browser preview: desktop layout and 390px iframe viewport visually inspected. Native browser executed the default 140-trial frequency experiment: 12/20 recoveries at 10 letters, 20/20 at each other tested length. These are observations of this sample plan, not universal accuracy claims.

Preview limitation: the mandated internal preview origin is plain HTTP at terminal.local, so the browser correctly withholds crypto.subtle there. Full encryption and attack UI flows were exercised in jsdom with native Node Web Crypto; crypto outputs were additionally checked independently against Node crypto. The deployed GitHub Pages URL is HTTPS. No browser security setting was weakened to bypass the preview restriction.

The 40-trial core experiment (seed 20261015) measured 30/40 at 10 letters and 40/40 at lengths 25, 50, 100, 250, 500 and 1,000. Rates are calculated on demand; none are hardcoded into the app. Corpus reference counts are from a different book than the held-out samples. See README for provenance and tests for commands.
