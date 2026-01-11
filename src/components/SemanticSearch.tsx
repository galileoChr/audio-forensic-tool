import { useState } from 'react';
import { useAudioStore } from '../state/useAudioStore';
import { findSemanticMatches } from '../utils/embedding';

export default function SemanticSearch() {
  const originalBuffer = useAudioStore((s) => s.originalBuffer);
  const setSemanticMatches = useAudioStore((s) => s.setSemanticMatches);
  const setError = useAudioStore((s) => s.setError);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSearch() {
    if (!originalBuffer) {
      setError('Load audio first.');
      return;
    }
    if (!query.trim()) {
      setSemanticMatches([]);
      return;
    }
    setBusy(true);
    try {
      const matches = await findSemanticMatches(originalBuffer, query);
      setSemanticMatches(matches);
    } catch (error) {
      console.error(error);
      setError('Semantic search failed. Ensure transformers.js model can load.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel semantic">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Semantic Layer</div>
          <h2>Similarity search</h2>
          <p className="muted">Type a word (e.g., “knocking”). Matching regions light up in cyan.</p>
        </div>
        <div className="button-row">
          <input
            className="text-input"
            placeholder="Search for a semantic rhythm…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="primary" disabled={busy} onClick={handleSearch}>
            {busy ? 'Analyzing…' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
