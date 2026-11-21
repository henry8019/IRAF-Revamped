# Contributing to IRAF-Revamped

[简体中文](CONTRIBUTING.zh-CN.md)

To try the app, follow [Clone and launch](README.md#-clone-and-launch). To report a bug, include the commit (`git rev-parse --short HEAD`), your OS and browser, and the shortest steps that reproduce it. Report vulnerabilities through the [security policy](SECURITY.md).

## Work on a change

Fork the repository, clone your fork, and create a topic branch. The React interface lives in `src/`, the local HTTP service in `workbench.py`, and the boxcar implementation in `boxcar.py`. The imported-observation algorithms live in `reductions.py`.

For a frontend change, use Node.js 24 and run the following in the repository root. Commit the rebuilt `dist/` with the source so a fresh clone can launch without Node.js.

```sh
npm ci
npm run build
git status --short -- dist
```

## Run the checks

Start with Python 3.12 and run `python tests/launch_smoke.py` (use `python3` if needed). This exercises the platform launcher, prepares its runtime, checks the initial empty workspace, and shuts down the service. A second run with the environment variable `UV_OFFLINE=1` checks that the prepared runtime works offline.

Run the following from the repository root. For `uv`, use the executable the launcher downloaded at `.runtime/uv` on macOS or Linux, or `.\.runtime\uv.exe` in PowerShell. On a fresh Linux desktop, use `install --with-deps chromium` to install Chromium’s system dependencies.

```sh
uv run --locked --group test python -m unittest discover -s tests
uv run --locked --group test python -m playwright install chromium
uv run --locked --group test python tests/desktop_ui.py
```

For a numerical change, include a small synthetic or shareable input, units, the expected result and tolerance, and how you derived them. Use original IRAF as a reference. If its output conflicts with the scientific definition, document both values and test the scientifically defined result.

Open a pull request against `main` describing the change and the checks you ran. Maintainers can use the linked CI results to review the build and launcher checks on all three operating systems. For changes to numerical output, review the reference values and tolerance alongside the code.

## Cutting a release

Update the application version in `pyproject.toml` and `package.json`, refresh both lockfiles, and rebuild `dist/`. Update the bilingual changelog and download links in both READMEs. After the release PR and the merged commit pass CI, tag that commit as `vX.Y.Z` and publish the changelog entry on GitHub Releases. Download and extract the tagged archive and run the launcher smoke test from that copy.
