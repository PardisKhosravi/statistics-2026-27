# Statistics 2026/27 — Pardis Khosravi

Interactive coursework for Statistics, MSc Cybersecurity, Sapienza University of Rome. Student ID: 2236692.

The site uses **HTML, CSS and JavaScript**. It is a static site: no build process, backend, API keys, wallet connection or blockchain access is required.

## Pages

- `index.html`: coursework index.
- `hw1/index.html`: toy elliptic-curve arithmetic, algorithm replay and statistical census.
- `hw2/index.html`: Ethereum wallet pipeline, checksum and hash experiments, statistical analysis and historical context.

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

These URLs are not live until the repository has been created, uploaded and published.

## Verification

Run `node tests/checks.cjs` with Node.js 18 or later. No package installation is needed. Checks cover the whole toy group, algorithm equivalence, all 24 English BIP-39 reference vectors, BIP-32 vector 1 paths, EIP-55 examples, hash comparisons with Node's crypto module, and site-local links. The HW2 page also runs six selected self-checks visibly. For optional DOM interaction tests, run `npm install` then `npm run test:ui`. See `VERIFICATION.md` for the results and limits.

HW1 performs a census of all nonzero canonical scalars in the selected subgroup. HW2 uses reproducible structured inputs for the hash experiment and actual BIP-32 sibling addresses for the address experiment. The CSV buttons export measurements, not screenshots.

## Dependencies and attribution

- ethers **6.15.0**, MIT license: `assets/vendor/ethers-LICENSE.md`.
- js-sha3 **0.9.3**, MIT license: `assets/vendor/js-sha3-LICENSE.txt`.
- BIP-39 reference vectors: Trezor/python-mnemonic (MIT); BIP-32 reference vectors: bitcoin/bips (BSD-2-Clause). Source URLs are included in `tests/reference-vectors.json`.
- The toy arithmetic, interface and experiment code are authored for this coursework. The real wallet primitives use the libraries above; they are not claimed as independent implementations.

The pages include primary-source references and distinguish statistical observations from security claims. No manual test in a wallet application is claimed.
