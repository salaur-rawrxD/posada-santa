# La Posada — Facebook Instant Games (staging build)

**Meta App ID:** `3530558340439821`

This directory contains the build script for a **separate Facebook Instant Games edition** of `play.html`. It does not modify the Posada Santa website.

## Build and test the ZIP

The package job runs automatically when `play.html` or the Facebook build scripts change on `main`. Automatic runs **only build and save the ZIP**; they never upload or publish to Meta.

To run it on demand, in GitHub, open **Actions → Facebook Instant Games — Build / Stage → Run workflow**.

- Select branch `main`.
- Leave **Stage the built ZIP in Meta Web Hosting** set to **false**.
- Run the workflow.
- After it finishes, open the run and download the artifact named `la-posada-facebook-instant`. It contains `la-posada-facebook.zip`.

To build locally:

```sh
python3 scripts/facebook/build_instant.py
```

The output ZIP is `dist/la-posada-facebook.zip`, containing `index.html` and `fbapp-config.json` at its root.

## Optional: stage a build in Meta Web Hosting

The **Get app access token for uploads** button in the current Meta dashboard can open [Meta's App Access Token documentation](https://developers.facebook.com/documentation/facebook-login/guides/access-tokens#apptokens) rather than display a token. The GitHub workflow now supports requesting the app token **only during a manual upload run**, using the App ID and App Secret.

1. In [Meta's App Dashboard](https://developers.facebook.com/apps/3530558340439821/), open **App settings → Basic** and locate **App Secret**. Reveal it only in the dashboard; never paste it into chat or a GitHub code file. Do not enable Native/Desktop to do this.
2. Open this repository's **Settings → Secrets and variables → Actions → New repository secret**.
3. Create the secret named **`FACEBOOK_APP_SECRET`** with your Meta App Secret as its value.
4. Open **Actions → Facebook Instant Games — Build / Stage → Run workflow**, select branch `main`, and enable **upload_to_meta**. The workflow securely requests a temporary app access token from `https://graph.facebook.com/oauth/access_token`, then tries the `/{app_id}/assets` upload.
5. Check **Instant Games → Web hosting** for the staged build. **Uploading does not publish** the game or complete App Review.

Alternatively, if Meta provides an actual purpose-specific upload token, store it under `FACEBOOK_ASSET_UPLOAD_TOKEN`. When present, this token takes precedence over automatic app-token generation.

**Permissions note:** Meta distinguishes normal app access tokens from asset-upload authorization in older documentation. If Meta rejects a general app token with a permissions error, the workflow will stop, and we must resolve the app's Instant Games hosting permissions or get the correct token from Meta. Do not substitute a personal token or publish any secrets.

## Security

- Both secrets are **GitHub Actions repository secrets**, never placed in the client ZIP.
- **Do not share** an App Secret, generated access token, or token response in chat or screenshots.
- Only a manually dispatched workflow with `upload_to_meta=true` makes network calls to Meta for an upload; automatic commits only rebuild the downloadable ZIP.

## Limitations of this first staging edition

- **Local progress only.** Existing website family and friends scoreboards, organizer links, daily challenges, and email auth are not carried into Facebook. This protects exchange information and avoids accidental writes to the existing production Supabase service.
- The Facebook SDK is initialized, but Facebook identity sync, cloud achievements, leaderboards, and native social sharing **are not yet wired into the gameplay**.
- The game HTML and CSS are packaged; Google-hosted fonts are not bundled, and system font fallbacks apply.
- The build deliberately does not load the website's PostHog/Vercel scripts.
- The game still needs real-device testing inside Meta's Instant Games player before any public launch.
- Do not use the upload ZIP as a public production release without platform compatibility, privacy, and performance tests.

## Upload API reference

The build uploader follows the archived [Meta Instant Games sample project](https://github.com/fbsamples/fbinstant-samples) and posts multipart fields `asset`, `type=BUNDLE`, `comment`, and `access_token` to `https://graph-video.facebook.com/{app_id}/assets`. The sample repo was archived in 2023, so Meta may alter the endpoint or require additional app access. Verify availability in the current dashboard.

**Security:** Only the upload token is stored as a GitHub Actions secret. No secret belongs in the client ZIP.
