import { useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { LoopRegion } from '../state/useAudioStore';

interface Props {
  original?: WaveSurfer | null;
  reconstructed?: WaveSurfer | null;
  loopRegion?: LoopRegion | null;
}

export default function TransportBar({ original, reconstructed, loopRegion }: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!original) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    original.on('play', onPlay);
    original.on('pause', onPause);
    return () => {
      original.un('play', onPlay);
      original.un('pause', onPause);
    };
  }, [original]);

  useEffect(() => {
    if (!original || !loopRegion) return;
    const onProcess = (time: number) => {
      if (time > loopRegion.end) {
        original.seekTo(loopRegion.start / original.getDuration());
        original.play();
        reconstructed?.seekTo(loopRegion.start / original.getDuration());
        reconstructed?.play();
      }
    };
    original.on('timeupdate', onProcess);
    return () => {
      original.un('timeupdate', onProcess);
    };
  }, [original, reconstructed, loopRegion]);

  function playPause() {
    if (!original) return;
    const nowPlaying = !original.isPlaying();
    const targetTime = loopRegion
      ? loopRegion.start / Math.max(0.001, original.getDuration())
      : original.getCurrentTime() / Math.max(0.001, original.getDuration());
    if (loopRegion && original.getCurrentTime() > loopRegion.end) {
      original.seekTo(loopRegion.start / original.getDuration());
      reconstructed?.seekTo(loopRegion.start / original.getDuration());
    }
    original.playPause();
    if (nowPlaying) {
      reconstructed?.play();
      if (Number.isFinite(targetTime)) reconstructed?.seekTo(targetTime);
    } else {
      reconstructed?.pause();
    }
  }

  function stop() {
    original?.stop();
    reconstructed?.stop();
    setPlaying(false);
  }

  return (
    <div className="panel transport">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Transport</div>
          <h2>Playback & Loop</h2>
        </div>
        <div className="button-row">
          <button className="ghost" onClick={stop}>
            Stop
          </button>
          <button className="primary" onClick={playPause} disabled={!original}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
      {loopRegion ? (
        <div className="muted small">
          Looping {loopRegion.start.toFixed(2)}s → {loopRegion.end.toFixed(2)}s. Drag region on the waveform to adjust.
        </div>
      ) : (
        <div className="muted small">Select a region on the top waveform to loop faint sounds.</div>
      )}
    </div>
  );
}
