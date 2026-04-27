# Editable Sticker Notes Live

Build a real-time collaborative bulletin board where visitors can post, edit, and delete sticky notes on a shared canvas. No login required. Open the page, start adding notes — every change propagates instantly to everyone watching.

## Stack

- **Frontend**: Angular on port **3000**
- **Backend**: Node.js on port **3001**
- **Persistence**: SQLite
- **Real-time**: WebSockets

## The Board

The board fills the viewport — a large open area where sticker notes can be positioned freely. Clicking any empty part of the board creates a new note at approximately that position. Notes persist on the board for all users, surviving page reloads and new connections.

The board also displays a live count of how many users are currently connected.

## Sticker Notes

Each note is a card-like element placed on the board. A note has:

- **Text content** — editable by clicking on the note
- **A position** on the board (stored so it reappears in the same location after reload)

When a user clicks an existing note, it enters **edit mode**: a text cursor appears inside the note allowing the content to be modified. While a note is in edit mode:

- A **Delete** button is visible on that note
- If the user modifies the text, a **Save** button becomes visible

Clicking **Save** persists the updated text and broadcasts the change to all connected users. Clicking **Delete** removes the note from the board and notifies all connected users immediately.

Notes are not locked during editing — multiple users may edit the same note simultaneously. The most recent save wins. Similarly, if a delete and a save race against each other, the action that arrives at the server last determines the outcome: a later delete removes the note; a later save keeps it (with the saved content).

## Real-time Sync

All events — note creation, note update, note deletion — are broadcast to every connected client via WebSocket. Clients must not rely on polling; updates should appear without any page interaction by the receiving user.

When a client first connects, the server sends the full current state of the board so the user sees all existing notes immediately.

## Page Structure

The app is a **single page at `/`**. No other frontend routes are needed.

## `data-testid` Reference

Every interactive and observable element must carry the exact `data-testid` attribute listed below. The test harness depends on these strings precisely.

### Board

- `board` — the main bulletin board container (the clickable surface)
- `user-count` — element displaying the number of currently connected users (e.g. `"3 users online"` or just `"3"` — any format that includes the numeric count)

### Notes

- `note-{id}` — the note card element, where `{id}` is the note's unique identifier (e.g. `note-42`)
- `note-text-{id}` — the text content / editable area inside a note
- `note-save-{id}` — the Save button for a note (only visible when the note has unsaved changes)
- `note-delete-{id}` — the Delete button for a note (only visible when the note is in edit mode / focused)
