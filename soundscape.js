/**
 * Sofa2Slugger Soundscape Player
 * Implements deterministic playback contract for all sessions (1-10)
 */

// Run token system - prevents stale callbacks from previous play runs
let activeRunId = 0;
function nextRunId() {
  activeRunId += 1;
  return activeRunId;
}

// Unloading guard - prevents completion during navigation
let isUnloading = false;

// Register one-time unloading listeners (capture phase for early detection)
window.addEventListener('beforeunload', () => {
  isUnloading = true;
}, { capture: true, once: true });

window.addEventListener('pagehide', () => {
  isUnloading = true;
}, { capture: true, once: true });

class SoundscapePlayer {
  constructor(sessionNumber = 1, onSessionComplete = null) {
    this.audioContext = null;
    this.musicSource = null;
    this.voiceSource = null;
    this.musicGainNode = null;
    this.voiceGainNode = null;
    
    this.musicBuffer = null;
    this.introBuffer = null;
    this.trainingBuffer = null;
    this.outroBuffer = null;
    
    this.currentPhase = 'idle'; // idle, intro, training, outro
    this.musicLoopSources = []; // Track all active music sources for cleanup
    this.aborted = false; // Hard abort flag - prevents all sequencing when true
    this.sessionNumber = sessionNumber;
    this.onSessionComplete = onSessionComplete;
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Handle audio context state changes silently
      this.audioContext.addEventListener('statechange', () => {
        if (this.audioContext && (this.audioContext.state === 'interrupted' || this.audioContext.state === 'suspended')) {
          // Silent interruption - set abort flag to prevent completion callbacks
          this.aborted = true;
        }
      });
      
      // Handle audio context errors silently
      this.audioContext.addEventListener('error', () => {
        this.aborted = true;
      });
      
      // Create gain nodes
      this.musicGainNode = this.audioContext.createGain();
      this.voiceGainNode = this.audioContext.createGain();
      
      // Set fixed music gain (lower than voice)
      // Voice gain defaults to 1.0, music at 0.3 (adjustable but fixed)
      this.musicGainNode.gain.value = 0.2;
      this.voiceGainNode.gain.value = 1.0;
      
      // Connect gain nodes to destination
      this.musicGainNode.connect(this.audioContext.destination);
      this.voiceGainNode.connect(this.audioContext.destination);
      
      // Load audio files
      await this.loadAudioFiles();
    } catch (error) {
      // Silent failure - no error messages, no auto-retry
      this.aborted = true;
      throw error;
    }
  }

  async loadAudioFiles() {
    const sessionFolder = `session-${String(this.sessionNumber).padStart(2, '0')}`;
    const basePath = `assets/audio/${sessionFolder}/`;
    
    const [introData, trainingData, outroData, musicData] = await Promise.all([
      this.fetchAudioFile(`${basePath}intro.mp3`),
      this.fetchAudioFile(`${basePath}training.mp3`),
      this.fetchAudioFile(`${basePath}outro.mp3`),
      this.fetchAudioFile(`${basePath}music.mp3`)
    ]);
    
    this.introBuffer = await this.audioContext.decodeAudioData(introData);
    this.trainingBuffer = await this.audioContext.decodeAudioData(trainingData);
    this.outroBuffer = await this.audioContext.decodeAudioData(outroData);
    this.musicBuffer = await this.audioContext.decodeAudioData(musicData);
  }

  async fetchAudioFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${url}`);
    }
    return await response.arrayBuffer();
  }

  async play() {
    if (this.currentPhase !== 'idle') {
      return; // Already playing
    }
    
    // Reinitialize if audio context was closed
    if (!this.audioContext || this.audioContext.state === 'closed') {
      await this.init();
    }
    
    // Generate new run token and reset abort flag for fresh play
    this.runId = nextRunId();
    this.aborted = false;
    
    this.currentPhase = 'intro';
    this.playIntro();
  }

  stop() {
    // Hard kill: immediate silence, no sequencing, no timers, no callbacks, no fades
    
    // Invalidate run token first - prevents stale callbacks from this run
    nextRunId(); // Advance activeRunId to invalidate this.runId
    
    // Set abort flag - prevents all future sequencing
    this.aborted = true;
    
    // Stop all music loop sources
    this.musicLoopSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    this.musicLoopSources = [];
    
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
      } catch (e) {
        // Source may already be stopped
      }
      this.voiceSource = null;
    }
    
    // Close audio context immediately (hard kill)
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Context may already be closed
      }
      this.audioContext = null;
    }
    
    // Clear all references
    this.musicGainNode = null;
    this.voiceGainNode = null;
    this.currentPhase = 'idle';
  }

  playIntro() {
    // INTRO: Play intro.mp3, voice only, no music
    this.voiceSource = this.audioContext.createBufferSource();
    this.voiceSource.buffer = this.introBuffer;
    this.voiceSource.connect(this.voiceGainNode);
    
    // On end → transition immediately to training
    this.voiceSource.onended = () => {
      if (this.aborted) return;
      if (this.runId !== activeRunId) return; // Stale callback guard
      this.currentPhase = 'training';
      this.playTraining();
    };
    
    this.voiceSource.start(0);
  }

  playTraining() {
    // TRAINING: Start music.mp3 first
    this.startMusicLoop();
    
    // After ~4 seconds, start training.mp3
    const voiceStartTime = this.audioContext.currentTime + 4.0;
    
    this.voiceSource = this.audioContext.createBufferSource();
    this.voiceSource.buffer = this.trainingBuffer;
    this.voiceSource.connect(this.voiceGainNode);
    
    // On training end → transition to outro
    this.voiceSource.onended = () => {
      if (this.aborted) return;
      this.currentPhase = 'outro';
      this.playOutro();
    };
    
    this.voiceSource.start(voiceStartTime);
  }

  startMusicLoop() {
    // Start music and loop it seamlessly
    const playMusicLoop = () => {
      if (this.aborted) return;
      if (this.runId !== activeRunId) return; // Stale callback guard
      if (this.currentPhase === 'idle' || !this.audioContext) {
        return; // Stop was called or audio context closed
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = this.musicBuffer;
      source.connect(this.musicGainNode);
      
      // Track this source for cleanup
      this.musicLoopSources.push(source);
      
      // Schedule next loop before current ends
      source.onended = () => {
        if (this.aborted) return;
        if (this.runId !== activeRunId) return; // Stale callback guard
        
        // Remove from tracking array
        const index = this.musicLoopSources.indexOf(source);
        if (index > -1) {
          this.musicLoopSources.splice(index, 1);
        }
        
        // Continue loop if still playing
        if (this.currentPhase !== 'idle' && this.audioContext) {
          playMusicLoop();
        }
      };
      
      source.start(0);
    };
    
    playMusicLoop();
  }

  playOutro() {
    // OUTRO: Continue music, start outro.mp3 immediately
    // Music is already playing via loop
    
    this.voiceSource = this.audioContext.createBufferSource();
    this.voiceSource.buffer = this.outroBuffer;
    this.voiceSource.connect(this.voiceGainNode);
    
    // After outro finishes: keep music ~4 seconds, fade out smoothly, stop everything
    this.voiceSource.onended = () => {
      // Guard: abort flag
      if (this.aborted) return;
      
      // Guard: stale run token
      if (this.runId !== activeRunId) return;
      
      // Guard: unloading state
      if (isUnloading) return;
      
      // Set session1Completed only when Session 1 outro completes naturally
      // AND all guards pass (not aborted, not stale, not unloading)
      if (this.sessionNumber === 1) {
        localStorage.setItem('session1Completed', 'true');
        if (this.onSessionComplete) {
          this.onSessionComplete();
        }
      }
      
      const fadeStartTime = this.audioContext.currentTime;
      const fadeDuration = 4.0; // Keep music for ~4 seconds
      const fadeEndTime = fadeStartTime + fadeDuration;
      
      // Schedule fade-out
      this.musicGainNode.gain.cancelScheduledValues(fadeStartTime);
      this.musicGainNode.gain.setValueAtTime(0.3, fadeStartTime);
      this.musicGainNode.gain.linearRampToValueAtTime(0, fadeEndTime);
      
      // Stop everything after fade completes
      setTimeout(() => {
        if (this.aborted) return;
        if (this.runId !== activeRunId) return; // Stale callback guard
        this.stop();
      }, fadeDuration * 1000);
    };
    
    this.voiceSource.start(0);
  }
}

// Export for use
window.SoundscapePlayer = SoundscapePlayer;
