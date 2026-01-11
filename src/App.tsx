import { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import WaveformPair from './components/WaveformPair';
import TransportBar from './components/TransportBar';
import ReconstructionControls from './components/ReconstructionControls';
import SemanticSearch from './components/SemanticSearch';
import TranscriptionPanel from './components/TranscriptionPanel';
import VideoPreview from './components/VideoPreview';
import ExportButton from './components/ExportButton';
import { useAudioStore } from './state/useAudioStore';
import WaveSurfer from 'wavesurfer.js';

function StatusBanner() {
  const status = useAudioStore((s) => s.status);
  const error = useAudioStore((s) => s.error);
  return (
    <div className="status">
      <span className={`pill pill-${status}`}>{status}</span>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export default function App() {
  const originalUrl = useAudioStore((s) => s.originalUrl);
  const reconstructedUrl = useAudioStore((s) => s.reconstructedUrl);
  const videoUrl = useAudioStore((s) => s.videoUrl);
  const setProcessed = useAudioStore((s) => s.setProcessed);
  const loopRegion = useAudioStore((s) => s.loopRegion);
  const setLoopRegion = useAudioStore((s) => s.setLoopRegion);
  const semanticMatches = useAudioStore((s) => s.semanticMatches);
  const [originalWs, setOriginalWs] = useState<WaveSurfer | null>(null);
  const [reconWs, setReconWs] = useState<WaveSurfer | null>(null);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Semantic Forensic Audio</p>
          <h1>Recover the “unhearable” directly in the browser</h1>
          <p className="muted">
            Upload mobile recordings, reconstruct phase and rhythm with WASM DeepFilterNet, and search the noise floor
            semantically using CLAP embeddings.
          </p>
        </div>
        <ExportButton />
      </header>

      <StatusBanner />

      <FileUpload />

      <ReconstructionControls
        onReconstructed={(url, buffer) => {
          setProcessed({ url, buffer });
        }}
      />

      <TransportBar original={originalWs} reconstructed={reconWs} loopRegion={loopRegion} />

      <WaveformPair
        originalUrl={originalUrl}
        reconstructedUrl={reconstructedUrl}
        loopRegion={loopRegion}
        semanticMatches={semanticMatches}
        onLoopRegionChange={setLoopRegion}
        onReady={({ original, reconstructed }) => {
          setOriginalWs(original);
          setReconWs(reconstructed);
        }}
      />

      <SemanticSearch />
      <TranscriptionPanel />
      <VideoPreview src={videoUrl} />
    </div>
  );
}
