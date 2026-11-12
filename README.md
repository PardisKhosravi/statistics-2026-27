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


## Lesson 4 — two independently linked exercises

- Overview with two clickable cards: https://pardiskhosravi.github.io/statistics-2026-27/lesson4/
- Exercise 1: https://pardiskhosravi.github.io/statistics-2026-27/welford/
- Exercise 2: https://pardiskhosravi.github.io/statistics-2026-27/sampling-statistics/

Lesson 4 is in the global navigation after Lesson 3. The two exercise pages link to each other and back to the overview. No runtime dependencies were added: HTML, CSS and vanilla JavaScript reuse the existing common helpers and the Lesson 3 xoshiro128** generator.

`assets/welford.js` is the single numerical implementation used in both exercises. Its update has three statements: compute the old-mean deviation; increment the count and update the mean; update corrected SS with the new-mean deviation. Sample variance is SS/(n-1) for n>=2, and is undefined for an empty or singleton sample. Exercise 1 derives both descriptive and unbiased variance recurrences, uses correct initialization, provides an interactive trace and two-pass reference, and demonstrates translation-invariant variance versus catastrophic squared-sum cancellation. The small trace retains observations for teaching; the numerical algorithm itself uses constant state.

Exercise 2 fixes a discrete uniform score distribution on {0,...,10}: mu=5, sigma^2=10, fourth central moment=178. Every hacker uses the shared update for every score. It records per-hacker means and unbiased variances at nested sample-size checkpoints; across-hacker variance estimates use denominator m-1. Theoretical sampling variances are 10/n and [178-((n-3)/(n-1))*100]/n. The main comparisons use unbiased within-hacker variances; SS/n is separately shown with its biased expectation 10*(n-1)/n.

Defaults: maximum n=1000, m=2000, seed=20261103. A per-hacker stream is assigned by StochasticLab.rng(seed XOR 0x51f15e, 'sampling', attackerIndex). Prefixes are stable across n/m changes. To draw eleven integer scores without uint32 modulo bias, reject uint32 values >=4294967292 and reduce accepted values modulo 11. These are reproducible pseudorandom approximations to the independent-score model. The maximum settings are n=8192 and m=5000. Checkpoints reuse path prefixes, not independent experiments at each n. Results and exports are tied to the last completed snapshot; changed settings mark them stale, and cancellation retains the last complete result.

Charts distinguish estimator centers, estimator spread and Monte Carlo standard errors. Histogram bins show probabilities, not densities; adaptive axes and optional full common axes are explicitly labeled. Six paths are retained for visualization, with display-only reduction to local extrema; all scores contribute to Welford updates and all hackers to ensemble statistics. Per-hacker tables show the first 100; CSV exports include every hacker/checkpoint, the summary table, and complete first-six paths. No normal-theory t/chi-square assumption is made for uniform scores.

Checks: `npm run test:lesson4`; after installing the existing jsdom dev dependency, `npm run test:lesson4-ui`. The statistical assumptions and numerical/visual verification scope are recorded in VERIFICATION.md.

## Lesson 5 — Numerical integration and the normal CDF

- Overview: https://pardiskhosravi.github.io/statistics-2026-27/lesson5/
- Exercise 1: https://pardiskhosravi.github.io/statistics-2026-27/numerical-integration/
- Exercise 2: https://pardiskhosravi.github.io/statistics-2026-27/normal-cdf/

The first lab compares domain midpoint sums with midpoint heights weighted by the lengths of their preimages. It plots seven examples and discusses the improper integral, Dirichlet's function, and Thomae's function separately. The second lab compares composite Simpson integration, the erf power series, and a Cody rational approximation. It reports CDF and smaller-tail errors against independently generated high-precision references; the rounded NIST values are shown separately. Both labs offer convergence measurements, timing and CSV export. No runtime dependencies were added.

Run the numerical suite with `npm run test:lesson5`.
