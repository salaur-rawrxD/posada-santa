#!/usr/bin/env python3
"""Build a standalone La Posada Facebook Instant Games ZIP from play.html.

The website remains unchanged. No API secrets are bundled. This initial
Facebook edition uses local progress and disables website-only network RPCs.
"""
from pathlib import Path
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "dist" / "la-posada-facebook.zip"
SOURCE = ROOT / "play.html"

def make_html(source: str) -> str:
    html = source
    # Website analytics, PWA, site navigation helpers, and friend-group scripts
    # aren't required by Facebook and should not ship in the game bundle.
    html = re.sub(r'<script\b[^>]*\bsrc="/[^"]+"[^>]*>\s*</script>\s*', "", html)
    html = re.sub(r'<script\s+id="va-init"[^>]*>[\s\S]*?</script>\s*', "", html)
    html = re.sub(r'<link\b[^>]*\bhref="/[^"]+"[^>]*>\s*', "", html)
    html = re.sub(r'<link\b[^>]*\bhref="https://fonts.googleapis.com[^"]*"[^>]*>\s*', "", html)
    html = re.sub(r'<link\b[^>]*\bhref="https://fonts.gstatic.com[^"]*"[^>]*>\s*', "", html)
    html = re.sub(r'<link\b[^>]*\brel="canonical"[^>]*>\s*', "", html)
    # Remove the web edition's Supabase key and calls. An FB player must never
    # be enrolled into a real exchange just by running an Instant Game.
    old = r'async function rpc\(fn,args\)\{[\s\S]*?\}\s*const ORIGIN=location\.origin;'
    replacement = (
        'async function rpc(){throw new Error("Online family exchange unavailable in Instant Games");}\n'
        'const ORIGIN=location.origin;'
    )
    html, count = re.subn(old, replacement, html, count=1)
    if count != 1:
        raise RuntimeError("Could not isolate the existing Supabase RPC function")
    html = re.sub(r'const SB_URL="[^"]+", SB_KEY="[^"]+";', "", html)
    # Hide unrelated website-specific controls; gameplay and local character
    # selection remain intact. Avoid leaking visitors to nonbundled routes.
    html = html.replace('</head>', '''
<style>
a[href^="/"],a[href^="https://wa.me"],a[href^="sms:"]{display:none!important}
#famBan,#famChallenge,#famTell,#famShare,.famcard,[data-pcrumbs]{display:none!important}
</style>
<script src="https://connect.facebook.net/en_US/fbinstant.7.1.js"></script>
<script>
(function(){
  if (!window.FBInstant) { console.warn("FBInstant SDK not available"); return; }
  FBInstant.initializeAsync().then(function(){
    FBInstant.setLoadingProgress(100);
    return FBInstant.startGameAsync();
  }).then(function(){
    console.info("La Posada Instant Games initialized");
  }).catch(function(error){
    console.error("FBInstant initialization failed", error);
  });
})();
</script>
</head>''')
    # Remove URL-only metadata that refers to assets absent from this ZIP.
    html = re.sub(r'<meta\s+property="og:image"[^>]*>\s*', "", html)
    # Remove external website navigation if a link is dynamically reconstructed.
    return html

def main():
    if not SOURCE.is_file():
        raise SystemExit("Missing play.html at repository root")
    html = make_html(SOURCE.read_text(encoding="utf-8"))
    if "FBInstant.initializeAsync()" not in html:
        raise AssertionError("Missing FBInstant bootstrap")
    if 'SB_KEY="' in html or "us.i.posthog.com" in html:
        raise AssertionError("Sensitive or website-only configuration remains")
    cfg = {"instant_games": {
        "platform_version": "RICH_GAMEPLAY",
        "orientation": "LANDSCAPE",
        "navigation_menu_version": "NAV_FLOATING"
    }}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zip_file:
        zip_file.writestr("index.html", html)
        zip_file.writestr("fbapp-config.json", json.dumps(cfg, indent=2) + "\n")
    with zipfile.ZipFile(OUTPUT) as z:
        assert {"index.html", "fbapp-config.json"} <= set(z.namelist())
        assert z.testzip() is None
    print(f"Facebook Instant Games bundle: {OUTPUT} ({OUTPUT.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
