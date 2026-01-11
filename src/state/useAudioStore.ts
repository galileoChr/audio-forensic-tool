import { create } from 'zustand';

export type AudioStatus = 'idle' | 'loading' | 'ready' | 'processing';

export interface LoopRegion {
  start: number;
  end: number;
}

export interface SemanticMatch {
  start: number;
  end: number;
  score: number;
}

interface AudioState {
  fileName?: string;
  originalUrl?: string;
  videoUrl?: string;
  reconstructedUrl?: string;
  originalBuffer?: AudioBuffer;
  processedBuffer?: AudioBuffer;
  status: AudioStatus;
  error?: string;
  loopRegion?: LoopRegion | null;
  semanticMatches: SemanticMatch[];
  transcript?: string;
  setOriginal: (data: {
    fileName?: string;
    url?: string;
    buffer?: AudioBuffer;
    videoUrl?: string;
  }) => void;
  setProcessed: (data: { url?: string; buffer?: AudioBuffer }) => void;
  setStatus: (status: AudioStatus) => void;
  setError: (error?: string) => void;
  setLoopRegion: (region: LoopRegion | null) => void;
  setSemanticMatches: (matches: SemanticMatch[]) => void;
  setTranscript: (text?: string) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  status: 'idle',
  semanticMatches: [],
  setOriginal: ({ fileName, url, buffer, videoUrl }) =>
    set((state) => {
      if (state.originalUrl && state.originalUrl !== url) {
        URL.revokeObjectURL(state.originalUrl);
      }
      if (state.videoUrl && state.videoUrl !== videoUrl) {
        URL.revokeObjectURL(state.videoUrl);
      }
      return {
        fileName,
        originalUrl: url ?? state.originalUrl,
        originalBuffer: buffer ?? state.originalBuffer,
        videoUrl: videoUrl ?? state.videoUrl,
      };
    }),
  setProcessed: ({ url, buffer }) =>
    set((state) => {
      if (state.reconstructedUrl && state.reconstructedUrl !== url) {
        URL.revokeObjectURL(state.reconstructedUrl);
      }
      return {
        reconstructedUrl: url ?? state.reconstructedUrl,
        processedBuffer: buffer ?? state.processedBuffer,
      };
    }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setLoopRegion: (loopRegion) => set({ loopRegion }),
  setSemanticMatches: (semanticMatches) => set({ semanticMatches }),
  setTranscript: (transcript) => set({ transcript }),
  reset: () => {
    set((state) => {
      if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
      if (state.reconstructedUrl) URL.revokeObjectURL(state.reconstructedUrl);
      return {
        fileName: undefined,
        originalUrl: undefined,
        videoUrl: undefined,
        reconstructedUrl: undefined,
        originalBuffer: undefined,
        processedBuffer: undefined,
        status: 'idle',
        error: undefined,
        loopRegion: null,
        semanticMatches: [],
        transcript: undefined,
      };
    });
  },
}));
