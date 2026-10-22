# Statistics 2026/27 — Pardis Khosravi

Interactive coursework for Statistics, MSc Cybersecurity, Sapienza University of Rome. Student ID: 2236692.

The site uses **HTML, CSS and JavaScript**. It is a static site: no build process, backend, API keys, wallet connection or blockchain access is required.

## Pages

- `index.html`: coursework index.
- `hw1/index.html` (Lesson 1, part A): toy elliptic-curve arithmetic, algorithm replay and statistical census.
- `hw2/index.html` (Lesson 1, part B): Ethereum wallet pipeline, checksum and hash experiments, statistical analysis and historical context.

- `lesson2/index.html` (Lesson 2 / Homework 2): Caesar, secp256k1 ECDH + HKDF-SHA-256 + AES-256-GCM, statistical Caesar recovery, held-out length trials and bounded ECC key search.

Open `index.html` in a modern browser, or serve the project directory with `python -m http.server 8000`. All dependencies are included locally. Use only educational phrases in the wallet lab.

## Publish on GitHub Pages

1. Create the public repository `statistics-2026-27` in the `PardisKhosravi` account.
2. Upload the contents of this directory **directly to the repository root**, keeping the `assets`, `hw1` and `hw2` directories intact. Do not upload the enclosing folder as an extra level.
3. Open **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Choose branch **main**, folder **/(root)**, then Save.
5. Wait for GitHub to report successful publication.

Expected URLs after successful publication:

- https://PardisKhosravi.github.io/statistics-2026-27/
- https://PardisKhosravi.github.io/statistics-2026-27/hw1/
- https://PardisKhosravi.github.io/statistics-2026-27/hw2/

The repository is published through GitHub Pages from the main branch.

## Verification

Run `node tests/checks.cjs` with Node.js 18 or later. No package installation is needed. Checks cover the whole toy group, algorithm equivalence, all 24 English BIP-39 reference vectors, BIP-32 vector 1 paths, EIP-55 examples, hash comparisons with Node's crypto module, and site-local links. The HW2 page also runs six selected self-checks visibly. For optional DOM interaction tests, run `npm install` then `npm run test:ui`. See `VERIFICATION.md` for the results and limits.

HW1 performs a census of all nonzero canonical scalars in the selected subgroup. HW2 uses reproducible structured inputs for the hash experiment and actual BIP-32 sibling addresses for the address experiment. The CSV buttons export measurements, not screenshots.

## Dependencies and attribution

- ethers **6.15.0**, MIT license: `assets/vendor/ethers-LICENSE.md`.
- js-sha3 **0.9.3**, MIT license: `assets/vendor/js-sha3-LICENSE.txt`.
- BIP-39 reference vectors: Trezor/python-mnemonic (MIT); BIP-32 reference vectors: bitcoin/bips (BSD-2-Clause). Source URLs are included in `tests/reference-vectors.json`.
- The toy arithmetic, interface and experiment code are authored for this coursework. The real wallet primitives use the libraries above; they are not claimed as independent implementations.

The pages include primary-source references and distinguish statistical observations from security claims. No manual test in a wallet application is claimed.

## Lesson 2 verification and data

Use HTTPS or localhost for Web Crypto. Run `node tests/lesson2-checks.cjs`; optional DOM interactions: `node tests/lesson2-ui.cjs` after installing jsdom. Recipient keys are deliberately 1–4,096. This teaching hybrid is not a production protocol or Ethereum wallet encryption standard. Its fresh ephemeral scalar uses rejection sampling across the full standard subgroup order. It has no sender authentication.

The attacker enumerates public points, does not read the secret input and decrypts with the recovered scalar. The packet exports no private scalar. GCM authentication is checked before returning any text.

`assets/corpus-en.js` bundles ASCII letter counts from Jane Austen’s *Pride and Prejudice* (563,924 letters) and a 95,000-letter extract of Lewis Carroll’s *Alice’s Adventures in Wonderland*. These original works are public domain. Sources: https://www.gutenberg.org/ebooks/1342 and https://www.gutenberg.org/ebooks/11 ; downloaded 2026-10-22. Ebook header and footer removed before transformation; the Alice extract begins at “Alice was beginning”. Counts for the reference edition include its public-domain editorial material. No reference prose is used as evaluation data. For a reproducible run, the seed shuffles a schedule of lengths, then disjoint windows are drawn in that order; a separate random shift is assigned to each. The LCG is only a sampling tool, never a cryptographic key generator. CSV records the seed, offsets, actual/predicted shifts and the exact reference counts.

The two Lesson 1 URLs are preserved. Lesson 2 has a single entry URL: https://pardiskhosravi.github.io/statistics-2026-27/lesson2/ .


## Lesson 3 — Stochastic penetration processes

Entry: https://pardiskhosravi.github.io/statistics-2026-27/lesson3/ . This page adds no runtime dependency: HTML, CSS and plain JavaScript only. It runs Bernoulli and symmetric Rademacher models together, compares S_n, S_n/n and S_n/sqrt(n), and distinguishes the number of systems from the number of attacker replicates. It includes trajectories, lattice-aware endpoint histograms, unbiased sample moments, log–log variance curves, LLN tail probabilities and Chebyshev bounds, correctly standardized CLT histograms and CDFs, exact-versus-empirical CDF distances, and aggregate attacker scores.

Defaults: n=2048, m=2000, p=0.3, epsilon=0.1, seed=20261022. Limits: 16–8192 systems, 2–5000 attackers, 0<=p<=1, 10^-6<=epsilon<=1. Both deterministic Bernoulli endpoints p=0 and p=1 are supported; their CLT standardization is explicitly undefined. Cancellation preserves the last complete experiment. Changed inputs mark results stale and disable CSV export until a successful run. Checkpoint/model selection only redraws stored results.

`assets/stochastic.js` contains numerical logic. `assets/lesson3.js` renders SVGs and controls the UI. The generator is the xoshiro128** transition by David Blackman and Sebastiano Vigna (CC0), with application-defined deterministic initialization: XOR the seed, model tag (Bernoulli 0xa341316c; Rademacher 0xc8013ea4), and (attacker+1)*0x9e3779b9 mod 2^32; initialize four words with mix32(base+(i+1)*0x9e3779b9), replacing the all-zero state with [1,0,0,0] if necessary. The mix32 implementation and constants are in source. Uniforms use each uint32 output divided by 2^32. Noncryptographic pseudorandom streams approximate the i.i.d. model; no independence proof is claimed. Model/attacker streams make prefixes stable when n or m changes. Checkpoints share path prefixes and are not independent experiments.

Exact finite-n probabilities are computed from binomial weights by recurrence outward from the mode followed by normalization. Histogram windows retain all observed endpoints and a theoretical +/-4 SD window, clipped to the support. Omitted exact tail mass is reported, never renormalized. Bins group adjacent lattice values and are affinely rescaled for the three required quantities. CLT histograms compare probability per bin with integrated normal probability, not density. CDF distances inspect both sides of each jump. Numerical normal CDF accuracy was independently checked on 2,001 grid points against Python math.erf (maximum error 7.451e-8).

CSV exports contain both models: summary moments/tails/CDF distances at all checkpoints, every attacker's endpoint at every checkpoint, and every step of the first up-to-eight displayed paths. The file records seed, model parameters and relevant sample sizes. No data or settings are sent to a server.

Checks: `npm run test:lesson3`; UI checks after jsdom installation: `npm run test:lesson3-ui`. See VERIFICATION.md for observations and verification scope.
