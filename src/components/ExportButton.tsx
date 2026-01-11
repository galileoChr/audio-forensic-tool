import { useAudioStore } from '../state/useAudioStore';
import { audioBufferToWavBlob } from '../utils/exportWav';

export default function ExportButton() {
  const processedBuffer = useAudioStore((s) => s.processedBuffer);
  const fileName = useAudioStore((s) => s.fileName);

  function handleExport() {
    if (!processedBuffer) return;
    const blob = audioBufferToWavBlob(processedBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName?.replace(/\.[^/.]+$/, '') || 'reconstructed') + '-deepfilter.wav';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="primary" disabled={!processedBuffer} onClick={handleExport}>
      Export reconstructed WAV
    </button>
  );
}
