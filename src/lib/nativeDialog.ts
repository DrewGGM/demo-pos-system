// Thin wrapper around the native file picker exposed by the Go App.
//
// Background: Wails v2 does NOT include OpenFileDialog in the window.runtime
// shim it injects into the renderer (only WindowXxx / EventsXxx / LogXxx).
// The dialog has to be invoked from Go via runtime.OpenFileDialog, so we
// added a thin App.OpenFileDialog wrapper on the backend that wails binds
// for us — accessible as window.go.main.App.OpenFileDialog. Everywhere in
// the SPA that needs a file picker should go through this helper instead
// of fishing it out of window.runtime (which silently returns undefined
// and lights up a "no disponible" toast).
//
// Returns the absolute path the user picked, or null when the dialog
// can't be opened (no wails binding — e.g. running in a plain browser).
// An empty string from the bridge counts as "user cancelled" and also
// returns null so callers can early-return uniformly.

export interface FileFilter {
  displayName: string;
  pattern: string; // e.g. "*.sql.gz;*.sql;*.backup"
}

export interface OpenFileDialogOptions {
  title?: string;
  defaultDirectory?: string;
  defaultFilename?: string;
  filters?: FileFilter[];
}

type WailsBinding = (opts: any) => Promise<string>;

function resolveBinding(): WailsBinding | null {
  const w = window as any;
  const appFn = w?.go?.main?.App?.OpenFileDialog;
  if (typeof appFn === 'function') return appFn;
  const runtimeFn = w?.runtime?.OpenFileDialog;
  if (typeof runtimeFn === 'function') return runtimeFn;
  return null;
}

export function isOpenFileDialogAvailable(): boolean {
  return resolveBinding() !== null;
}

export async function openFileDialog(opts: OpenFileDialogOptions): Promise<string | null> {
  const fn = resolveBinding();
  if (!fn) return null;
  const payload = {
    Title: opts.title ?? '',
    DefaultDirectory: opts.defaultDirectory ?? '',
    DefaultFilename: opts.defaultFilename ?? '',
    Filters: (opts.filters ?? []).map((f) => ({
      DisplayName: f.displayName,
      Pattern: f.pattern,
    })),
  };
  const path = await fn(payload);
  return path && path.length > 0 ? path : null;
}
