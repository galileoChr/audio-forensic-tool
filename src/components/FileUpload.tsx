import { useRef, useState } from 'react';
import { loadMediaFile } from '../utils/audioLoader';
import { useAudioStore } from '../state/useAudioStore';

const ACCEPT = 'audio/wav,audio/x-wav,audio/m4a,audio/mp4,video/mp4';

export default function FileUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setOriginal = useAudioStore((s) => s.setOriginal);
  const setProcessed = useAudioStore((s) => s.setProcessed);
  const setStatus = useAudioStore((s) => s.setStatus);
  const setError = useAudioStore((s) => s.setError);
  const reset = useAudioStore((s) => s.reset);
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const file = fileList[0];
    setBusy(true);
    setStatus('loading');
    setError(undefined);
    try {
      const media = await loadMediaFile(file);
      setOriginal({
        fileName: file.name,
        url: media.audioUrl,
        buffer: media.audioBuffer,
        videoUrl: media.videoUrl,
      });
      setProcessed({ url: undefined, buffer: undefined });
      setStatus('ready');
    } catch (error) {
      console.error(error);
      setError('Unable to decode file. Try WAV, M4A, or MP4 recorded on device.');
      setStatus('idle');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel upload">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Input</div>
          <h2>Drop or upload a recording</h2>
          <p className="muted">WAV, M4A, MP4 from your phone are supported. Video will preview inline.</p>
        </div>
        <div className="button-row">
          <button
            className="ghost"
            onClick={() => {
              reset();
              setStatus('idle');
            }}
          >
            Clear
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-busy={busy}
          >
            {busy ? 'Loading…' : 'Choose file'}
          </button>
        </div>
      </div>

      <label className="dropzone">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="drop-hint">Tap to browse or drop a file here</div>
      </label>
    </div>
  );
}
