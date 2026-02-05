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
    this.bellBuffer = null; // Session 9 and Session 10 bell sound
    
    this.currentPhase = 'idle'; // idle, intro, training, outro
    this.musicLoopSources = []; // Track all active music sources for cleanup
    this.aborted = false; // Hard abort flag - prevents all sequencing when true
    this.sessionNumber = sessionNumber;
    this.onSessionComplete = onSessionComplete;
    
    // Session 9 bell timing (timestamps in seconds from playback start)
    // Session 10 bell timing (timestamps in seconds from playback start)
    if (this.sessionNumber === 9) {
      this.bellTimings = [333, 393, 422, 482, 510, 570];
    } else if (this.sessionNumber === 10) {
      this.bellTimings = [330, 510]; // Start of round, End of round
    } else {
      this.bellTimings = [];
    }
    this.bellFired = new Set(); // Track which bells have fired
    this.playbackStartTime = null; // AudioContext time when playback started
    this.totalPausedTime = 0; // Accumulated paused duration
    this.pauseStartTime = null; // AudioContext time when paused
    this.bellCheckInterval = null; // Timer for checking bell timings
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
    
    const filePromises = [
      this.fetchAudioFile(`${basePath}intro.mp3`),
      this.fetchAudioFile(`${basePath}training.mp3`),
      this.fetchAudioFile(`${basePath}outro.mp3`),
      this.fetchAudioFile(`${basePath}music.mp3`)
    ];
    
    // Load bell file for Session 9 and Session 10
    if (this.sessionNumber === 9 || this.sessionNumber === 10) {
      filePromises.push(this.fetchAudioFile(`${basePath}bell`));
    }
    
    const results = await Promise.all(filePromises);
    
    this.introBuffer = await this.audioContext.decodeAudioData(results[0]);
    this.trainingBuffer = await this.audioContext.decodeAudioData(results[1]);
    this.outroBuffer = await this.audioContext.decodeAudioData(results[2]);
    this.musicBuffer = await this.audioContext.decodeAudioData(results[3]);
    
    // Decode bell buffer for Session 9 and Session 10
    if (this.sessionNumber === 9 || this.sessionNumber === 10) {
      this.bellBuffer = await this.audioContext.decodeAudioData(results[4]);
    }
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
    
    // Reset bell state for Session 9 and Session 10
    if (this.sessionNumber === 9 || this.sessionNumber === 10) {
      this.bellFired.clear();
      this.playbackStartTime = this.audioContext.currentTime;
      this.totalPausedTime = 0;
      this.pauseStartTime = null;
      this.startBellCheck();
    }
    
    this.currentPhase = 'intro';
    this.playIntro();
  }

  stop() {
    // Hard kill: immediate silence, no sequencing, no timers, no callbacks, no fades
    
    // Invalidate run token first - prevents stale callbacks from this run
    nextRunId(); // Advance activeRunId to invalidate this.runId
    
    // Set abort flag - prevents all future sequencing
    this.aborted = true;
    
    // Stop bell checking for Session 9 and Session 10
    if (this.bellCheckInterval) {
      clearInterval(this.bellCheckInterval);
      this.bellCheckInterval = null;
    }
    
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
    this.playbackStartTime = null;
    this.totalPausedTime = 0;
    this.pauseStartTime = null;
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

  // Session 9 and Session 10 bell timing logic
  startBellCheck() {
    if ((this.sessionNumber !== 9 && this.sessionNumber !== 10) || !this.bellTimings.length) return;
    
    // Clear any existing interval
    if (this.bellCheckInterval) {
      clearInterval(this.bellCheckInterval);
    }
    
    // Check bell timings every 100ms for precision
    this.bellCheckInterval = setInterval(() => {
      if (this.aborted || !this.audioContext || this.audioContext.state === 'closed') {
        clearInterval(this.bellCheckInterval);
        this.bellCheckInterval = null;
        return;
      }
      
      if (!this.playbackStartTime) return;
      
      const currentTime = this.audioContext.currentTime;
      
      // If audio context is suspended, don't advance playback time
      if (this.audioContext.state === 'suspended') {
        // Adjust playbackStartTime to account for the pause
        if (this.pauseStartTime === null) {
          this.pauseStartTime = currentTime;
        }
        lastCheckTime = currentTime;
        return;
      }
      
      // If resuming from suspension, adjust playbackStartTime
      if (this.pauseStartTime !== null) {
        const pauseDuration = currentTime - this.pauseStartTime;
        this.totalPausedTime += pauseDuration;
        this.pauseStartTime = null;
      }
      
      // Calculate elapsed playback time (excluding paused time)
      const elapsedTime = currentTime - this.playbackStartTime - this.totalPausedTime;
      
      // Check each bell timing
      this.bellTimings.forEach(timing => {
        // Fire bell if we've reached or passed the timing and it hasn't fired yet
        // Use a small tolerance (0.1s) to account for interval timing
        // Note: If playback jumps past a timing, it will fire once when we reach it
        if (elapsedTime >= timing - 0.1 && !this.bellFired.has(timing)) {
          this.playBell();
          this.bellFired.add(timing);
        }
      });
      
      // Stop checking if all bells have fired
      if (this.bellFired.size === this.bellTimings.length) {
        clearInterval(this.bellCheckInterval);
        this.bellCheckInterval = null;
      }
    }, 100);
  }

  playBell() {
    if (!this.bellBuffer || !this.audioContext || this.aborted) return;
    if (this.audioContext.state === 'closed' || this.audioContext.state === 'suspended') return;
    
    try {
      const bellSource = this.audioContext.createBufferSource();
      bellSource.buffer = this.bellBuffer;
      bellSource.connect(this.audioContext.destination);
      bellSource.start(0);
    } catch (e) {
      // Silent failure - bell may have already been cleaned up
    }
  }
}

// Export for use
window.SoundscapePlayer = SoundscapePlayer;
