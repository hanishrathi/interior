# Deploying the preview site to cPanel

The library itself is not deployed — it is imported by applications. What can be hosted is the static
**preview site** in `site/`: the tokens and a few components rendered from the library, using the
sample data (fictional or unverified, labelled as such on the page).

## Build

```bash
npm install
npm run package:site        # builds site-dist/ and writes clawed-design-preview.zip
```

`npm run build:site` builds only `site-dist/`. The build uses relative asset paths, so the same files
work at the root of a domain or in any subfolder. It needs only static hosting — no Node, PHP or
database on the server — and is built locally or in CI, never on the cPanel server.

## Upload with File Manager (no credentials shared with anyone)

1. In cPanel open **File Manager** and go to `public_html` (or the subdomain's document root).
   For a subfolder, create it first, e.g. `public_html/design-preview`.
2. **Upload** `clawed-design-preview.zip`, select it, then **Extract**.
3. Delete the zip. Open the address in a browser and check that the Components and Tokens tabs work.

To publish a new version, build again, extract over the old files and delete the previous
`assets/index-*.js` and `assets/index-*.css` (their names change with the content).

## Automating it later (needs the account's details)

A GitHub Action can upload `site-dist/` on every merge to `main` over FTPS or SFTP. It needs, stored as
GitHub Actions **secrets** (never in the repository): the host name, an FTP/SFTP account restricted to
the target folder, its password or key, and the target path. cPanel's Git Version Control
(`.cpanel.yml`) is not a fit because it deploys files that are committed, and the built files are not.

## Notes

- The page is marked `noindex`. Remove the robots meta tag in `site/index.html` to let search engines
  list it.
- Do not put real client or product data in `site/`; it is public once uploaded.
