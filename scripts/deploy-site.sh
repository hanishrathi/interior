#!/usr/bin/env bash
#
# Uploads the built preview site (site-dist/) to an FTPS account such as a cPanel hosting account.
#
#   DEPLOY_HOST=… DEPLOY_USER=… DEPLOY_PASSWORD=… DEPLOY_PATH=public_html/design-preview \
#     bash scripts/deploy-site.sh
#
# Required environment
#   DEPLOY_HOST      FTP host name. Must match the server's TLS certificate (cPanel > FTP Accounts >
#                    "Configure FTP Client" shows the right one). Certificates are always verified.
#   DEPLOY_USER      FTP account name, e.g. deploy@example.com.
#   DEPLOY_PASSWORD  Its password. Written only to a temporary lftp script that is readable by the current
#                    user alone and deleted on exit - never to a command line or to the log.
#   DEPLOY_PATH      Target folder relative to the account's FTP root, e.g. public_html/design-preview.
#                    Use "/" when the account is restricted to the target folder (the recommended setup):
#                    that folder is then the account's root.
# Optional
#   DEPLOY_PORT            Default 21 (explicit TLS).
#   DEPLOY_SOURCE          Default site-dist.
#   DEPLOY_DRY_RUN         "true" prints what would change and changes nothing.
#   DEPLOY_ALLOW_NONEMPTY  "true" lets the first deploy go into a folder that already holds other files.
#   DEPLOY_VERIFY_URL      Public address of the folder; checked over HTTPS after the upload.
#   DEPLOY_CA_FILE         Extra CA certificate to trust (testing against a private server).
#
# Safety
#   - Only files this script uploaded earlier are ever deleted: it keeps a manifest
#     (.clawed-design-manifest) in the target folder and removes only the entries that dropped out.
#   - The first deploy refuses a folder that already contains other files, so a wrong DEPLOY_PATH cannot
#     overwrite an existing website.
#   - index.html is uploaded last, so visitors never see a page whose assets are missing.
set -euo pipefail
umask 077

MARKER=.clawed-design-manifest

die() {
  echo "deploy-site: $*" >&2
  exit 1
}

: "${DEPLOY_HOST:?set DEPLOY_HOST (the FTP host name)}"
: "${DEPLOY_USER:?set DEPLOY_USER (the FTP account name)}"
: "${DEPLOY_PASSWORD:?set DEPLOY_PASSWORD (the FTP account password)}"
: "${DEPLOY_PATH:?set DEPLOY_PATH (target folder, e.g. public_html/design-preview)}"
SOURCE="${DEPLOY_SOURCE:-site-dist}"
PORT="${DEPLOY_PORT:-21}"
DRY_RUN="${DEPLOY_DRY_RUN:-false}"
ALLOW_NONEMPTY="${DEPLOY_ALLOW_NONEMPTY:-false}"

command -v lftp >/dev/null || die "lftp is not installed (sudo apt-get install lftp)."
[[ -f "$SOURCE/index.html" ]] || die "$SOURCE/index.html not found - run 'npm run build:site' first."

# --- Validate what ends up inside lftp command files ---------------------------------------------
[[ "$DEPLOY_HOST" =~ ^[A-Za-z0-9.-]+$ ]] || die "DEPLOY_HOST must be a plain host name."
[[ "$DEPLOY_USER" =~ ^[A-Za-z0-9._@-]+$ ]] || die "DEPLOY_USER contains unexpected characters."
[[ "$PORT" =~ ^[0-9]+$ ]] || die "DEPLOY_PORT must be a number."
[[ "$DEPLOY_PASSWORD" != *$'\n'* ]] || die "DEPLOY_PASSWORD must not contain a line break."

path="$DEPLOY_PATH"
while [[ "$path" == ./* ]]; do path="${path#./}"; done
while [[ "$path" == */ && "$path" != "/" ]]; do path="${path%/}"; done
case "$path" in
  "" | "~" | *..*) die "DEPLOY_PATH '$DEPLOY_PATH' is not a safe target folder." ;;
  "." | "/") path=. ;; # the FTP root itself; the first-deploy check below guards against a busy one
  *) [[ "$path" =~ ^/?[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ ]] || die "DEPLOY_PATH may only use letters, digits, '.', '_', '-' and '/'." ;;
esac

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
# lftp reads quoted strings with backslash escapes, so any password can be written safely.
quoted_password="${DEPLOY_PASSWORD//\\/\\\\}"
quoted_password="${quoted_password//\"/\\\"}"

preamble() {
  echo "set cmd:fail-exit yes"
  echo "set net:max-retries 2"
  echo "set net:timeout 20"
  echo "set net:reconnect-interval-base 5"
  echo "set ftp:ssl-force yes"
  echo "set ftp:ssl-allow yes"
  echo "set ftp:ssl-protect-data yes"
  echo "set ftp:ssl-protect-list yes"
  echo "set ftp:passive-mode yes"
  echo "set ssl:verify-certificate yes"
  echo "set ssl:check-hostname yes"
  if [[ -n "${DEPLOY_CA_FILE:-}" ]]; then echo "set ssl:ca-file \"$DEPLOY_CA_FILE\""; fi
  echo "open -p $PORT -u \"$DEPLOY_USER,$quoted_password\" ftp://$DEPLOY_HOST"
}

run() { # run <commands…>: one lftp session with the preamble and the given commands
  { preamble; printf '%s\n' "$@"; } >"$work/script"
  lftp -f "$work/script"
}

# --- 1. Connect and log in ------------------------------------------------------------------------
run "cls -1" >/dev/null 2>"$work/err" || die "cannot connect or log in to $DEPLOY_HOST: $(tr '\n' ' ' <"$work/err")"

# --- 2. Look at the target folder -----------------------------------------------------------------
remote_exists=false
if run "cd \"$path\"" >/dev/null 2>&1; then remote_exists=true; fi

listing=""
have_manifest=false
if $remote_exists; then
  listing="$(run "cd \"$path\"" "cls -1a")"
  listing="$(printf '%s\n' "$listing" | sed 's|/$||; s|^\./||' | grep -vxE '\.|\.\.|' || true)"
  if printf '%s\n' "$listing" | grep -qxF "$MARKER"; then have_manifest=true; fi
fi

if $have_manifest; then
  run "cd \"$path\"" "get \"$MARKER\" -o \"$work/old.manifest\"" >/dev/null
else
  : >"$work/old.manifest"
  # A first deploy must not land in a folder that holds somebody else's files. Entries cPanel
  # creates by default do not count.
  foreign="$(printf '%s\n' "$listing" | grep -vxE 'cgi-bin|\.well-known|\.htaccess|\.ftpquota|error_log' | grep -v '^$' || true)"
  if [[ -n "$foreign" && "$ALLOW_NONEMPTY" != "true" ]]; then
    echo "deploy-site: '$path' already contains files this script did not upload:" >&2
    echo "  ${foreign//$'\n'/$'\n'  }" >&2
    die "refusing to deploy over them. Use an empty folder, or set DEPLOY_ALLOW_NONEMPTY=true if overwriting is intended."
  fi
fi

# --- 3. Work out the change -----------------------------------------------------------------------
(cd "$SOURCE" && find . -type f ! -name "$MARKER" | sed 's|^\./||' | LC_ALL=C sort) >"$work/new.manifest"

# Only names that look like files this script uploads can be deleted.
safe_old="$(grep -E '^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$' "$work/old.manifest" | grep -vE '(^|/)\.\.(/|$)' || true)"
stale="$(comm -23 <(printf '%s\n' "$safe_old" | LC_ALL=C sort -u | grep -v '^$' || true) "$work/new.manifest" || true)"

echo "Target: $DEPLOY_USER@$DEPLOY_HOST:$path ($(wc -l <"$work/new.manifest" | tr -d ' ') files to upload, $(printf '%s\n' "$stale" | grep -c . || true) stale to remove)"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run - nothing was changed. Upload:"
  sed 's/^/  + /' "$work/new.manifest"
  [[ -z "$stale" ]] || printf '%s\n' "$stale" | sed 's/^/  - /'
  exit 0
fi

# --- 4. Upload (index.html last), then remove what the previous deploy left behind -----------------
commands=()
[[ "$path" == . ]] || commands+=("mkdir -p -f \"$path\"")
commands+=("cd \"$path\"")
commands+=("mirror -R --parallel=2 --exclude-glob index.html --exclude-glob \"$MARKER\" \"$SOURCE\" .")
commands+=("put \"$SOURCE/index.html\" -o index.html")
commands+=("put \"$work/new.manifest\" -o \"$MARKER\"")
while IFS= read -r file; do
  [[ -n "$file" ]] && commands+=("rm -f \"$file\"")
done <<<"$stale"
run "${commands[@]}" >/dev/null 2>"$work/err" || die "upload failed: $(tr '\n' ' ' <"$work/err")"
echo "Uploaded."

# --- 5. Check the public address ------------------------------------------------------------------
if [[ -n "${DEPLOY_VERIFY_URL:-}" ]]; then
  base="${DEPLOY_VERIFY_URL%/}"
  html="$(curl -fsSL --max-time 30 "$base/?deploy=$RANDOM")" || die "$base did not answer after the upload."
  printf '%s' "$html" | grep -q 'Clawed Design' || die "$base answers, but it is not the preview site - is DEPLOY_PATH the folder that site serves?"
  asset="$(printf '%s' "$html" | grep -oE 'assets/[A-Za-z0-9._-]+\.js' | head -1)"
  [[ -n "$asset" ]] && { curl -fsSI --max-time 30 "$base/$asset" >/dev/null || die "$base/$asset is missing."; }
  echo "Verified $base"
fi
