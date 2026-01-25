# Project Map (gemini.md)

## Source of Truth
*   **Primary Data State**: Local Browser Memory (Session). No server-side persistence.
*   **Project Goal**: Instagram Profile Grid Previewer. Preview next post in context of existing feed.
*   **Platform**: Web Application (HTML/CSS/JS). No backend required.

## Behavioral Rules
*   **Privacy First**: No data saving to server. All images handle locally (Blob URLs).
*   **Simplicity**: No login required.
*   **Monetization**: Ad placeholders present.
*   **Error Handling**: Graceful fallback if Instagram fetch fails (Manual Upload is King).

## Data Schema
**Application State (JSON):**

```json
{
  "session_id": "string (uuid)",
  "user_profile": {
    "username": "string | null",
    "avatar_url": "string (blob_or_remote)",
    "is_fetched": "boolean"
  },
  "grid": {
    "items": [
        {
          "id": "string (unique)",
          "source_type": "instagram_fetch" | "local_upload" | "placeholder",
          "url": "string (blob_url_or_remote_url)",
          "order_index": "integer (0-8)"
        }
    ]
  },
  "settings": {
    "show_ads": true
  }
}
```

## Link Verification (Phase 2 Findings)
*   **Instagram Public Fetch**:
    *   **Success**: Can fetch `og:image` (Profile Pic) and `og:description` (Follower count) via CORS proxy/scraper.
    *   **Limitation**: Grid images are heavily obfuscated/dynamic.
    *   **Strategy**: "Best Effort" mode will grab the basics (Name, Pic, Bio) and leave the grid empty for manual filling if deep scraping fails.

## Maintenance Log
*   2026-01-25: Initialization and Schema Definition.
*   2026-01-25: Phase 2 Link Verification complete. Confirmed meta tag accessibility.
*   2026-01-25: Phase 3 & 4 Completed. Application Architecture built and Styled with Premium CSS.
