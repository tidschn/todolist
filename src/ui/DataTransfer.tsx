import { useState, type ChangeEvent } from 'react';
import { useApp } from '../app/AppContext';
import { exportState, importState } from '../storage/serialization';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function DataTransfer() {
  const { state, today, dispatch } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function exportData() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamified-todo-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const imported = importState(await readFile(file));
      if (!window.confirm('Importing replaces all current data in this browser. Continue?')) return;
      dispatch({ type: 'replaceState', state: imported, today });
      setMessage('Import complete.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that file.');
    }
  }

  return (
    <div className="data-transfer">
      <button onClick={exportData}>Export data</button>
      <label>
        Import data{' '}
        <input type="file" accept="application/json,.json" onChange={onFile} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
