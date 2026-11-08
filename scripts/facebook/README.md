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

1. In [Meta's Developer Dashboard](https://developers.facebook.com/apps/3530558340439821/), look for **Instant Games → Web Hosting**. If this product/tab is missing, confirm that the Meta app was created for Instant Games and that the account has access to Web Hosting. You may need to wait for approval.
2. Under Web Hosting, find **Get Asset Upload Access Token**. This is **not** the App ID and **not** the App Secret.
3. In this GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Name it **`FACEBOOK_ASSET_UPLOAD_TOKEN`** and paste the token there. Never commit it to GitHub and do not paste it in chat.
4. In GitHub **Actions → Facebook Instant Games — Build / Stage → Run workflow**, set `upload_to_meta` to **true**. The workflow stages the ZIP via the `/{app_id}/assets` Graph API endpoint.
5. Check the staged build under the Meta **Web Hosting** tab and test with authorized testers. **Uploading does not publish your game**. Final publishing and app review are handled separately in Meta's dashboard.

If Meta returns a permissions or unsupported endpoint error, do not retry with your App Secret or a personal access token. The upload is blocked until Meta enables Web Hosting and supplies the correct asset-upload token.

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
