import { useState } from 'react';
import { useAudioStore } from '../state/useAudioStore';
import { transcriber } from '../utils/transcription';

type Source = 'original' | 'reconstructed';

export default function TranscriptionPanel() {
  const originalBuffer = useAudioStore((s) => s.originalBuffer);
  const processedBuffer = useAudioStore((s) => s.processedBuffer);
  const transcript = useAudioStore((s) => s.transcript);
  const setTranscript = useAudioStore((s) => s.setTranscript);
  const setError = useAudioStore((s) => s.setError);
  const setStatus = useAudioStore((s) => s.setStatus);
  const [source, setSource] = useState<Source>('original');
  const [busy, setBusy] = useState(false);

  async function handleTranscribe() {
    const buffer = source === 'original' ? originalBuffer : processedBuffer;
    if (!buffer) {
      setError('Load audio and run reconstruction (if needed) before transcribing.');
      return;
    }
    setBusy(true);
    setStatus('processing');
    setError(undefined);
    try {
      const text = await transcriber.transcribe(buffer);
      setTranscript(text);
    } catch (err) {
      console.error(err);
      setError('Transcription failed. Whisper model may not have loaded.');
    } finally {
      setStatus('ready');
      setBusy(false);
    }
  }

  return (
    <div className="panel transcription">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Transcription</div>
          <h2>Convert audio to text</h2>
          <p className="muted">Runs Whisper (Xenova) in-browser. Choose source and transcribe.</p>
        </div>
        <div className="button-row">
          <select
            className="text-input"
            value={source}
            onChange={(e) => setSource(e.target.value as Source)}
            style={{ width: 160 }}
          >
            <option value="original">Original</option>
            <option value="reconstructed">Reconstructed</option>
          </select>
          <button className="primary" disabled={busy} onClick={handleTranscribe}>
            {busy ? 'Transcribing…' : 'Transcribe'}
          </button>
        </div>
      </div>
      <div className="transcript-box">
        {transcript ? <pre>{transcript}</pre> : <span className="muted">No transcript yet.</span>}
      </div>
    </div>
  );
}
