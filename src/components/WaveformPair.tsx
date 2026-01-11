import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { LoopRegion, SemanticMatch } from '../state/useAudioStore';

interface Props {
  originalUrl?: string;
  reconstructedUrl?: string;
  loopRegion?: LoopRegion | null;
  semanticMatches: SemanticMatch[];
  onLoopRegionChange: (region: LoopRegion | null) => void;
  onReady?: (instances: { original: WaveSurfer | null; reconstructed: WaveSurfer | null }) => void;
}

function createWaveform(
  container: HTMLElement,
  url: string,
  waveColor: string,
  progressColor: string,
  withRegions: boolean,
  minPxPerSec: number,
): WaveSurfer {
  const clampZoom = Math.max(10, minPxPerSec);
  const options: WaveSurferOptions = {
    container,
    waveColor,
    progressColor,
    height: 120,
    barWidth: 1,
    barGap: 1,
    barRadius: 1,
    cursorWidth: 1,
    normalize: true,
    interact: true,
    hideScrollbar: true,
    autoCenter: false,
    autoScroll: false,
    fillParent: false,
    minPxPerSec: clampZoom,
    plugins: withRegions ? [RegionsPlugin.create()] : [],
  };
  const instance = WaveSurfer.create(options);
  instance.load(url);
  return instance;
}

export default function WaveformPair({
  originalUrl,
  reconstructedUrl,
  loopRegion,
  semanticMatches,
  onLoopRegionChange,
  onReady,
}: Props) {
  const originalRef = useRef<HTMLDivElement | null>(null);
  const reconstructedRef = useRef<HTMLDivElement | null>(null);
  const [originalWs, setOriginalWs] = useState<WaveSurfer | null>(null);
  const [reconWs, setReconWs] = useState<WaveSurfer | null>(null);
  const [zoom, setZoom] = useState(70);
  const [jumpValue, setJumpValue] = useState('');

  const [duration, setDuration] = useState(0);
  const [originalReady, setOriginalReady] = useState(false);
  const [reconReady, setReconReady] = useState(false);

  useEffect(() => {
    if (!originalRef.current || !originalUrl) return;
    const ws = createWaveform(originalRef.current, originalUrl, '#7aa3ff', '#5cf0e4', true, zoom);
    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setOriginalReady(true);
    });
    setOriginalWs(ws);
    return () => {
      setOriginalReady(false);
      try {
        ws.destroy();
      } catch (err) {
        console.warn('wavesurfer destroy failed', err);
      }
      setOriginalWs(null);
    };
  }, [originalUrl]);

  useEffect(() => {
    if (!reconstructedRef.current || !reconstructedUrl) return;
    const ws = createWaveform(reconstructedRef.current, reconstructedUrl, '#92ffcb', '#5cf0e4', false, zoom);
    ws.on('ready', () => {
      setReconReady(true);
    });
    setReconWs(ws);
    return () => {
      setReconReady(false);
      try {
        ws.destroy();
      } catch (err) {
        console.warn('wavesurfer destroy failed', err);
      }
      setReconWs(null);
    };
  }, [reconstructedUrl]);

  useEffect(() => {
    onReady?.({ original: originalWs, reconstructed: reconWs });
  }, [originalWs, reconWs, onReady]);

  useEffect(() => {
    if (!originalWs || !duration) return;
    const handleInteraction = (time: number) => {
      const start = Math.max(0, time - 0.25);
      const end = Math.min(duration, start + 0.75);
      onLoopRegionChange({ start, end });
      centerOnTime(time);
    };
    originalWs.on('interaction', handleInteraction);
    return () => {
      originalWs.un('interaction', handleInteraction);
    };
  }, [originalWs, duration, onLoopRegionChange]);

  useEffect(() => {
    if (!originalWs || !originalReady) return;
    try {
      originalWs.zoom(zoom);
    } catch (err) {
      console.warn('Zoom skipped: original not ready', err);
    }
    try {
      if (reconWs && reconReady) reconWs.zoom(zoom);
    } catch (err) {
      console.warn('Zoom skipped: reconstructed not ready', err);
    }
    // Keep current time in view after zoom changes.
    const current = originalWs.getCurrentTime?.() ?? 0;
    centerOnTime(current);
  }, [zoom, originalWs, reconWs, originalReady, reconReady]);

  useEffect(() => {
    if (!originalWs) return;
    const plugin = originalWs.getActivePlugins().find((p) => (p as any).regions) as any;
    if (!plugin) return;
    if (typeof plugin.clear === 'function') plugin.clear();
    if (loopRegion) {
      plugin.addRegion({
        id: 'loop',
        start: loopRegion.start,
        end: loopRegion.end,
        drag: true,
        resize: true,
        color: 'rgba(124, 176, 255, 0.25)',
      });
    }
    semanticMatches.forEach((match, idx) => {
      plugin.addRegion({
        id: `semantic-${idx}`,
        start: match.start,
        end: match.end,
        drag: false,
        resize: false,
        color: `rgba(92, 240, 228, ${Math.min(0.15 + match.score * 0.25, 0.5)})`,
      });
    });

    const handleRegionUpdate = (region: Region) => {
      if (region.id === 'loop') {
        onLoopRegionChange({ start: region.start, end: region.end });
      }
    };
    plugin.on('region-updated', handleRegionUpdate);
    plugin.on('region-created', handleRegionUpdate);
    return () => {
      plugin.un('region-updated', handleRegionUpdate);
      plugin.un('region-created', handleRegionUpdate);
    };
  }, [originalWs, loopRegion, semanticMatches, onLoopRegionChange]);

  const zoomLabel = useMemo(() => `${(zoom / 50).toFixed(2)}x`, [zoom]);

  function centerOnTime(time: number) {
    const container = originalRef.current;
    if (!container || !duration) return;
    const totalWidth = container.scrollWidth;
    const viewport = container.clientWidth;
    if (totalWidth <= viewport) return;
    const target = (time / duration) * totalWidth - viewport / 2;
    container.scrollLeft = Math.max(0, target);
  }

  function jumpToTime() {
    if (!originalWs || !duration) return;
    const value = parseFloat(jumpValue);
    if (Number.isNaN(value)) return;
    const clamped = Math.max(0, Math.min(value, duration));
    const fraction = clamped / duration;
    originalWs.seekTo(fraction);
    reconWs?.seekTo(fraction);
    centerOnTime(clamped);
  }

  return (
    <div className="panel waveforms">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Visual Layer</div>
          <h2>Original vs. Reconstructed</h2>
          <p className="muted">
            Zoom in and pan to hunt for micro-fluctuations. Regions highlight semantic hits.
          </p>
        </div>
        <div className="zoom">
          <label>
            Zoom <span className="muted">{zoomLabel}</span>
          </label>
          <input type="range" min={30} max={400} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <div className="jump">
            <input
              className="text-input"
              placeholder="Jump to sec"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              style={{ width: 110 }}
            />
            <button className="ghost" onClick={jumpToTime} disabled={!duration}>
              Go
            </button>
          </div>
        </div>
      </div>
      <div className="wave-pair">
        <div className="wave-block">
          <div className="wave-title">Noisy Input</div>
          <div className="wave" ref={originalRef} />
        </div>
        <div className="wave-block">
          <div className="wave-title">Deep-filtered</div>
          <div className="wave" ref={reconstructedRef} />
        </div>
      </div>
      {duration > 0 && <div className="muted tiny">Duration: {duration.toFixed(2)}s</div>}
    </div>
  );
}
