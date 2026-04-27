import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Note {
  id: number;
  text: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  notes: Note[] = [];
  userCount = 0;
  editingId: number | null = null;
  editTexts: { [id: number]: string } = {};

  private ws: WebSocket | null = null;
  private readonly API = 'http://localhost:3001';
  private readonly WS_URL = 'ws://localhost:3001';

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.WS_URL);
    } catch {
      setTimeout(() => this.connect(), 1000);
      return;
    }

    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data as string);
      switch (msg.type) {
        case 'init':
          this.notes = msg.notes as Note[];
          this.userCount = msg.userCount as number;
          for (const note of this.notes) {
            if (this.editTexts[note.id] === undefined) {
              this.editTexts[note.id] = note.text;
            }
          }
          break;

        case 'note_created':
        case 'note_updated':
          this.applyNoteUpdate(msg.note as Note);
          break;

        case 'note_deleted':
          this.applyNoteDelete(msg.id as number);
          break;

        case 'user_count':
          this.userCount = msg.count as number;
          break;
      }
    };

    this.ws.onclose = () => setTimeout(() => this.connect(), 1000);
    this.ws.onerror = () => { /* handled by onclose */ };
  }

  private applyNoteUpdate(note: Note): void {
    const idx = this.notes.findIndex(n => n.id === note.id);
    const isEditing = this.editingId === note.id;
    const currentSavedText = idx !== -1 ? this.notes[idx].text : '';
    const wasDirty = isEditing && this.editTexts[note.id] !== currentSavedText;

    if (idx !== -1) {
      this.notes[idx] = note;
    } else {
      this.notes.push(note);
    }

    // Only update textarea if: not editing, OR editing but no unsaved changes
    if (!isEditing || !wasDirty) {
      this.editTexts[note.id] = note.text;
    }
  }

  private applyNoteDelete(id: number): void {
    const isEditing = this.editingId === id;
    const hasDirty = isEditing && this.isDirty(id);

    if (hasDirty) {
      // Keep note visible so user can still save (TC-11: save after delete wins)
      return;
    }

    this.notes = this.notes.filter(n => n.id !== id);
    if (this.editingId === id) {
      this.editingId = null;
    }
  }

  isDirty(noteId: number): boolean {
    const note = this.notes.find(n => n.id === noteId);
    return this.editTexts[noteId] !== (note?.text ?? '');
  }

  onBoardClick(event: MouseEvent): void {
    // Only create a note when clicking the board background, not child elements
    if (event.target !== event.currentTarget) return;

    const x = event.offsetX;
    const y = event.offsetY;

    fetch(`${this.API}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', x, y })
    }).catch(console.error);
  }

  onNoteClick(note: Note, event: MouseEvent): void {
    event.stopPropagation();
    this.editingId = note.id;
    if (this.editTexts[note.id] === undefined) {
      this.editTexts[note.id] = note.text;
    }
  }

  saveNote(noteId: number, event: MouseEvent): void {
    event.stopPropagation();
    const note = this.notes.find(n => n.id === noteId);
    const text = this.editTexts[noteId] ?? '';

    fetch(`${this.API}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, x: note?.x ?? 0, y: note?.y ?? 0 })
    }).catch(console.error);
  }

  deleteNote(noteId: number, event: MouseEvent): void {
    event.stopPropagation();
    fetch(`${this.API}/notes/${noteId}`, { method: 'DELETE' }).catch(console.error);
  }
}
