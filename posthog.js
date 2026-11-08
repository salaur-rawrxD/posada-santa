/* Posada Santa: privacy-conscious PostHog analytics.
 * Replace the project token and (if needed) the regional API host below.
 * The project token is a public client-side identifier, NOT a secret API key.
 */
(function () {
  "use strict";

  var PROJECT_TOKEN = "phc_mspcYg97PRRSVGZ6ihsgviSrrZXUXHdamaYi2i68yDw7";
  var API_HOST = "https://us.i.posthog.com";

  if (!PROJECT_TOKEN || !PROJECT_TOKEN.startsWith("phc_")) return;
  if (!/^https:\/\/(us|eu|us-assets|eu-assets)\.i\.posthog\.com$/.test(API_HOST)) return;

  // Recommended PostHog browser snippet, adapted from PostHog's JS SDK docs.
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  var pathname = window.location.pathname;
  var safeUrl = window.location.origin + pathname; // No query or hash: they can contain private invites or keys.
  var safeProperties = {
    distinct_id: true, $device_id: true, $session_id: true,
    $lib: true, $lib_version: true, $insert_id: true, $time: true,
    $browser: true, $os: true, $referring_domain: true,
    $current_url: true, $pathname: true, $host: true, page: true
  };
  window.posthog.init(PROJECT_TOKEN, {
    api_host: API_HOST,
    defaults: "2026-08-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    capture_exceptions: false,
    person_profiles: "never",
    persistence: "sessionStorage",
    before_send: function (event) {
      if (!event) return event;
      var original = event.properties || {};
      var clean = {};
      Object.keys(original).forEach(function (key) {
        if (safeProperties[key]) clean[key] = original[key];
      });
      clean.$current_url = safeUrl;
      clean.$pathname = pathname;
      clean.$host = window.location.host;
      event.properties = clean;
      return event;
    }
  });

  window.posthog.capture("$pageview", {
    $current_url: safeUrl, $pathname: pathname, $host: window.location.host
  });

  // Reuse existing, manually chosen Vercel events without forwarding personal data.
  var originalTrack = window.psTrack;
  window.psTrack = function (eventName, data) {
    if (typeof originalTrack === "function") originalTrack(eventName, data);
    if (typeof eventName === "string" && /^[a-z][a-z0-9_]{1,50}$/.test(eventName)) {
      window.posthog.capture(eventName, { page: pathname });
    }
  };
})();
