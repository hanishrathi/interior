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

## Automatic deploys from GitHub

`.github/workflows/deploy-site.yml` uploads the site over **FTPS** (explicit TLS, port 21) after every push
to `main` that passed the Check workflow. It does nothing until you add the settings below, so it is safe
to merge before the account exists.

### One-time setup

1. **Create a restricted FTP account.** In cPanel open **FTP Accounts** and add one, for example
   `deploy@yourdomain.com`, with **Directory** set to the folder that will serve the site
   (e.g. `public_html/design-preview`). Use a long generated password. A restricted account can only
   ever touch that folder.
2. **Note the FTP host.** cPanel > FTP Accounts > *Configure FTP Client* lists the **FTP server** name.
   Use that exact name (not your domain unless it matches): the certificate is always verified.
3. **Add repository settings** (GitHub > Settings > Secrets and variables > Actions):

   | Kind | Name | Value |
   | --- | --- | --- |
   | Variable | `CPANEL_HOST` | The FTP server name from step 2. Setting it switches the workflow on. |
   | Variable | `CPANEL_USER` | The FTP account name, e.g. `deploy@yourdomain.com`. |
   | Variable | `CPANEL_PATH` | `/` for a restricted account (its folder is its root), otherwise the folder relative to the FTP root, e.g. `public_html/design-preview`. |
   | **Secret** | `CPANEL_PASSWORD` | The account's password. Never put it in a file or a chat. |
   | Variable (optional) | `CPANEL_SITE_URL` | The public address, e.g. `https://yourdomain.com/design-preview`. After uploading, the workflow checks that it serves the preview site. |
   | Variable (optional) | `CPANEL_PORT` | Only if the host uses a port other than 21. |

4. **Try it without changing anything:** Actions > *Deploy site* > *Run workflow* with **dry run** ticked.
   It prints what would be uploaded and removed. Run it again unticked to deploy.

### What it does, and what it will not do

- Builds the site from the commit that passed Check, then uploads it with `scripts/deploy-site.sh`
  (usable locally too; the variables it reads are listed at the top of the script).
- Uploads assets first and `index.html` last, so visitors never see a page with missing files.
- **Removes only what it uploaded earlier.** It keeps `.clawed-design-manifest` in the folder and deletes
  only entries that dropped out of the new build (old hashed assets). Your other files are never touched.
- **Refuses a first deploy into a folder that already holds other files**, so a wrong `CPANEL_PATH`
  cannot overwrite an existing website. Set `DEPLOY_ALLOW_NONEMPTY=true` (script only) if you mean to.
- Always verifies the server's certificate; a host whose certificate does not match the name is an error,
  not something to bypass. It never deploys from pull requests or forks.
- SFTP and SSH are not supported; use FTPS, which cPanel hosting provides by default.

### Troubleshooting

| Message | Likely cause |
| --- | --- |
| `Certificate verification: … NOT trusted` / name mismatch | `CPANEL_HOST` is not the name on the certificate. Use the FTP server name cPanel shows. |
| `Login failed: 530` | Wrong `CPANEL_USER` or `CPANEL_PASSWORD`. cPanel FTP names include the domain part. |
| `already contains files this script did not upload` | `CPANEL_PATH` points at a folder with another site in it. Choose an empty folder. |
| `answers, but it is not the preview site` | `CPANEL_SITE_URL` serves a different folder than `CPANEL_PATH`. |

cPanel's Git Version Control (`.cpanel.yml`) is not used: it deploys files committed to the repository, and
the built files are not committed.

## Notes

- The page is marked `noindex`. Remove the robots meta tag in `site/index.html` to let search engines
  list it.
- Do not put real client or product data in `site/`; it is public once uploaded.
