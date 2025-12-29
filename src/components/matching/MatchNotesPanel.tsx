/**
 * MatchNotesPanel - Dedicated panel for managing notes on a buyer-property match
 *
 * Features:
 * - Display all notes with timestamps
 * - Add new notes (with GHL sync)
 * - Edit existing notes
 * - Delete notes
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface NoteEntry {
  id: string;
  text: string;
  timestamp: string;
  user?: string;
}

interface MatchNotesPanelProps {
  notes: NoteEntry[];
  onAddNote: (text: string) => Promise<void>;
  onEditNote?: (noteId: string, newText: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  maxHeight?: string;
}

export function MatchNotesPanel({
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  isLoading = false,
  className,
  maxHeight = '400px',
}: MatchNotesPanelProps) {
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort notes by timestamp (newest first)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    setIsAddingNote(true);
    try {
      await onAddNote(newNoteText.trim());
      setNewNoteText('');
      setShowAddForm(false);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleStartEdit = (note: NoteEntry) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editText.trim() || !onEditNote) return;

    setIsSaving(true);
    try {
      await onEditNote(editingNoteId, editText.trim());
      setEditingNoteId(null);
      setEditText('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId || !onDeleteNote) return;

    setIsDeleting(true);
    try {
      await onDeleteNote(deleteNoteId);
      setDeleteNoteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatNoteDate = (timestamp: string) => {
    const date = parseISO(timestamp);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-purple-600" />
          Notes
          {notes.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({notes.length})
            </span>
          )}
        </h3>
        {!showAddForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-3">
          <Textarea
            placeholder="Write a note..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewNoteText('');
              }}
              disabled={isAddingNote}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNoteText.trim() || isAddingNote}
            >
              {isAddingNote ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Note'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No notes yet</p>
          <p className="text-xs mt-1">Add a note to keep track of important details</p>
        </div>
      ) : (
        <ScrollArea style={{ maxHeight }} className="pr-2">
          <div className="space-y-3">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  'bg-muted/30 rounded-lg p-3 group',
                  editingNoteId === note.id && 'ring-2 ring-purple-500'
                )}
              >
                {editingNoteId === note.id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px] resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editText.trim() || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground">
                        {formatNoteDate(note.timestamp)}
                        {note.user && <span className="ml-2">by {note.user}</span>}
                      </div>
                      {(onEditNote || onDeleteNote) && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEditNote && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleStartEdit(note)}
                            >
                              <Pencil className="h-3 w-3" />
                              <span className="sr-only">Edit note</span>
                            </Button>
                          )}
                          {onDeleteNote && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteNoteId(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="sr-only">Delete note</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MatchNotesPanel;
