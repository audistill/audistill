---
title: Troubleshooting
order: 70
---

Most issues fall into a few categories: the Transcription Model is not ready, a Source cannot be downloaded, a Model request failed, or a License needs attention.

## Add or Ingest is disabled

Check the Transcription Model banner at the top of the app. Audistill needs the local Transcription Model before it can create Transcripts.

If the banner says the model is downloading, wait for it to finish. If it says the download failed, open Settings → Transcription Model and choose Retry or Download. The Transcription Model is built into Audistill's workflow; there is no separate model picker for Transcription.

## A YouTube URL will not import

YouTube import requires `yt-dlp`. If Audistill cannot find it, install it with Homebrew or download it from the yt-dlp releases page, then use the URL popover or Settings → YouTube Import to point Audistill at the binary.

If the video needs cookies, membership access, or other special options, add them in Settings → YouTube Import → Custom arguments. Some videos may still be blocked by the site, region, account permissions, or a stale yt-dlp install.

## An RSS or direct media URL will not import

For feeds, confirm the URL points to an RSS or Atom feed with audio or video enclosures. Audistill fetches the feed on demand; it does not subscribe to it.

For direct URLs, the server needs to return a supported audio or video media file. HTML pages, login pages, and links that require credentials usually cannot be imported directly.

## An Episode failed during Ingest

Open the Episode and read the error message. If Retry is available, use it. Cancelled Episodes can also be restarted.

For URL-sourced Episodes, retry downloads the Source again. For Episodes that already have a Transcript, retry may continue with Recipe generation instead of repeating Transcription.

## A Recipe or Chat request failed

Open Settings and check that your OpenRouter API key is saved. Then check the selected Model. If a Recipe has a per-Recipe Model override, try switching it back to the default Model.

Model lists and Model requests come from OpenRouter, so network issues, account limits, or a provider outage can also cause failures.

## A License action failed

Open Settings → License and verify the current License state. If Activation limits are reached, use the customer portal to deactivate another machine. If the key is not recognized, double-check for typos. If the server cannot be reached, check your connection and try again.

## Still stuck

Retry the Episode when available. If the same Source keeps failing, copy the error message before asking for help.

## Contact

Email [info@audistill.com](mailto:info@audistill.com) for support. Include the error message, Source type, URL or filename, and what you were trying to do. Please do not send private audio, full Transcripts, API keys, or License keys unless support asks for them.
