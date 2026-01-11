import { useState } from 'react';
import { useAudioStore } from '../state/useAudioStore';
import { deepFilterEngine } from '../utils/deepFilterEngine';
import { audioBufferToWavBlob } from '../utils/exportWav';

interface Props {
  onReconstructed: (url: string, buffer: AudioBuffer) => void;
}

export default function ReconstructionControls({ onReconstructed }: Props) {
  const originalBuffer = useAudioStore((s) => s.originalBuffer);
  const setStatus = useAudioStore((s) => s.setStatus);
  const setError = useAudioStore((s) => s.setError);
  const [phaseGain, setPhaseGain] = useState(0.8);
  const [blend, setBlend] = useState(0.5);
  const [busy, setBusy] = useState(false);

  async function handleReconstruct() {
    if (!originalBuffer) {
      setError('Load audio first.');
      return;
    }
    setBusy(true);
    setStatus('processing');
    setError(undefined);
    try {
      const processed = await deepFilterEngine.process(originalBuffer, { phaseGain, blend });
      const blob = audioBufferToWavBlob(processed);
      const url = URL.createObjectURL(blob);
      onReconstructed(url, processed);
      setStatus('ready');
    } catch (error) {
      console.error(error);
      setError('Reconstruction failed. Ensure WASM assets are available.');
      setStatus('ready');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel controls">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Reconstruction</div>
          <h2>Phase gain & blend</h2>
          <p className="muted">Dial in DeepFilterNet parameters then run reconstruction.</p>
        </div>
        <button className="primary" disabled={!originalBuffer || busy} onClick={handleReconstruct} aria-busy={busy}>
          {busy ? 'Processing…' : 'Run reconstruction'}
        </button>
      </div>
      <div className="control-grid">
        <label>
          Phase gain <span className="muted">{phaseGain.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={phaseGain}
            onChange={(e) => setPhaseGain(Number(e.target.value))}
          />
        </label>
        <label>
          Stochastic ↔ Periodic blend <span className="muted">{blend.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={blend}
            onChange={(e) => setBlend(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
