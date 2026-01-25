# Architecture SOP: Instagram Grid Previewer

## 1. Core Philosophy
*   **State-Driven UI**: The UI is a pure function of the `state` object. Never manipulate the DOM directly without updating the state first.
*   **Immutability**: Treat the `state` as immutable. Create copies, modify, then render.
*   **Privacy**: No data leaves the client.

## 2. State Management (The "Store")
There is a single global `AppStore` class.

### Shape
```javascript
{
  profile: {
    username: string | null, // Verified via "Link" Phase to be fetchable from og:title
    avatarUrl: string | null,
    followers: string | null
  },
  grid: [
    // Always 9 items. Empty slots are placeholders.
    { id: string, type: 'empty' | 'image', url: string, file: Blob | null }
  ],
  settings: {
    darkMode: boolean
  }
}
```

## 3. DOM Interactions
*   **Rendering**: `renderGrid()` clears the container and rebuilds it from `state.grid`.
*   **Events**: Event listeners (Click, Drag, Drop) attach to the container, using delegation where possible.

## 4. Feature: Best-Effort Fetch
*   **Input**: Username.
*   **Process**:
    1.  Use `fetch('https://corsproxy.io/?' + encodedURL)` (or similar public proxy).
    2.  Parse HTML string.
    3.  Extract `<meta property="og:image">` for Avatar.
    4.  Extract `document.title` or meta description for Follower count.
    5.  **Grid Images**: Attempt to find `window._sharedData` or similar JSON. If not found, show "Private/Unreachable" placeholders and ask user to upload.

## 5. Feature: Drag & Drop
*   Use native HTML5 DnD API (`draggable="true"`).
*   **Events**:
    *   `dragstart`: Store `sourceIndex`.
    *   `dragover`: Allow drop (`preventDefault`).
    *   `drop`: Get `targetIndex`, swap items in `state.grid`, trigger `render()`.
