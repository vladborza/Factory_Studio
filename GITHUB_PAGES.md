# Application and ad on GitHub Pages

The repository includes both the current application (`dist/`, with source modules, tests and Docker services) and the animated advertisement (`ad/`).

## Enable publication

1. Open repository **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions → Publish app and ad to GitHub Pages → Run workflow**, selecting `main`.
4. Wait for both the build and deployment jobs to succeed.

After successful deployment, the expected addresses for this repository are:

- Application: https://vladborza.github.io/Factory_Studio/
- Advertisement: https://vladborza.github.io/Factory_Studio/ad/

These addresses are not proof of deployment. The successful Actions job and Settings → Pages show the actual published URL.

Later pushes to `main` run all tests and publish both together. A failed test prevents deployment. No npm dependencies are required. Node.js 22 runs the test suite and the build script.

## Static hosting limits

Pages hosts the browser application. Simulations run in a Web Worker, and models and experiments stay in the visitor's browser storage. Docker API services, central snapshot storage and revision conflicts are not hosted by Pages. Use `docker compose up --build -d` for those services. Moving from the Sites URL to Pages does not transfer browser storage: export models and experiments first and import on the new origin where supported.

The ad's 3D animation is a concept, not a released application feature. Its claimed improvement comes from a labelled synthetic simulation case, not measured customer performance. The published ad's call to action points to the application on Pages.

## Local packaging

Run `node scripts/build-pages.mjs` from the repository root. The `_site/` output contains the application at its root, the ad at `ad/`, and `.nojekyll`. Host this directory over HTTP for worker support. Keep `_site/` out of source control.

GitHub reference: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
