#!/usr/bin/env python3
"""
Sofa2Slugger Audio Mixer 🥊
Mix intro, training, music, and outro for all sessions.
Music is ducked so YOUR VOICE is the star of the show.
"""

import os
from pathlib import Path
from pydub import AudioSegment

# Configuration
AUDIO_BASE_PATH = Path.home() / "Sofa2Slugger-v2" / "assets" / "audio"
OUTPUT_DIR = AUDIO_BASE_PATH / "mixed_sessions"
MUSIC_REDUCTION_DB = -20  # How much quieter the music should be (adjust if needed)

def mix_session(session_num):
    """Mix audio files for a single session."""
    session_folder = AUDIO_BASE_PATH / f"session-{session_num:02d}"
    
    print(f"\n🥊 Processing Session {session_num}...")
    
    # Load the audio files
    intro = AudioSegment.from_mp3(session_folder / "intro.mp3")
    training = AudioSegment.from_mp3(session_folder / "training.mp3")
    outro = AudioSegment.from_mp3(session_folder / "outro.mp3")
    music = AudioSegment.from_mp3(session_folder / "music.mp3")
    
    # Duck the music (make it quieter)
    music_ducked = music + MUSIC_REDUCTION_DB
    
    # For sessions 9 and 10, load the bell from Golden_Box
    bell = None
    if session_num in [9, 10]:
        bell_path = AUDIO_BASE_PATH / "Golden_Box" / "bell"
        if bell_path.exists():
            bell = AudioSegment.from_file(bell_path)[:500]  # Trim to 0.5 seconds
            print(f"   🔔 Bell loaded (0.5s) for Session {session_num}")
    
    # Calculate timing for music overlay
    # Music should play during the training section
    training_duration = len(training)
    
    # Trim or loop music to match training duration
    if len(music_ducked) < training_duration:
        # Loop music if it's shorter than training
        loops_needed = (training_duration // len(music_ducked)) + 1
        music_ducked = music_ducked * loops_needed
    
    # Trim music to exact training duration
    music_ducked = music_ducked[:training_duration]
    
    # Mix training with music (overlay)
    training_with_music = training.overlay(music_ducked)
    
    # Build the final sequence
    # Intro -> Training (with music) -> Outro
    final_mix = intro + training_with_music + outro

    # Overlay bells at PRECISE timestamps for sessions 9 & 10
    # Timestamps are positions in the FINAL MIXED OUTPUT
    if bell and session_num == 9:
        # Session 9: 3 x 1-minute rounds - bells at exact timestamps
        bell_times = [
            (5, 45),   # 5m 45s - start round 1
            (6, 45),   # 6m 45s - end round 1
            (7, 15),   # 7m 15s - start round 2
            (8, 15),   # 8m 15s - end round 2
            (8, 40),   # 8m 40s - start round 3
            (9, 40),   # 9m 40s - end round 3
        ]
        print(f"   🔔 Adding 6 bells for 3 x 1-min rounds")
        for mins, secs in bell_times:
            position_ms = (mins * 60 + secs) * 1000
            final_mix = final_mix.overlay(bell, position=position_ms)
            print(f"      Bell at {mins}m {secs}s ({position_ms}ms)")

    elif bell and session_num == 10:
        # Session 10: 1 x 3-minute round - bells at exact timestamps
        bell_times = [
            (5, 32),   # 5m 32s - start round
            (8, 32),   # 8m 32s - end round
        ]
        print(f"   🔔 Adding 2 bells for 1 x 3-min round")
        for mins, secs in bell_times:
            position_ms = (mins * 60 + secs) * 1000
            final_mix = final_mix.overlay(bell, position=position_ms)
            print(f"      Bell at {mins}m {secs}s ({position_ms}ms)")
    
    # Export the mixed session
    output_path = OUTPUT_DIR / f"session-{session_num:02d}-mixed.mp3"
    final_mix.export(output_path, format="mp3", bitrate="192k")
    
    duration_mins = len(final_mix) / 1000 / 60
    print(f"   ✅ Session {session_num} mixed! Duration: {duration_mins:.1f} minutes")
    print(f"   📁 Saved to: {output_path}")
    
    return output_path

def main():
    """Mix all 10 sessions."""
    print("=" * 60)
    print("🥊 SOFA2SLUGGER AUDIO MIXER 🥊")
    print("=" * 60)
    print(f"\nMusic reduction: {MUSIC_REDUCTION_DB}dB")
    print(f"Audio source: {AUDIO_BASE_PATH}")
    
    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Check if pydub is installed
    try:
        from pydub import AudioSegment
    except ImportError:
        print("\n❌ Error: pydub is not installed!")
        print("\nTo install, run:")
        print("   pip install pydub")
        print("\nYou'll also need ffmpeg:")
        print("   sudo apt install ffmpeg")
        return
    
    # Process all 10 sessions
    successful = 0
    failed = 0
    
    for session_num in range(1, 11):
        try:
            mix_session(session_num)
            successful += 1
        except FileNotFoundError as e:
            print(f"   ❌ Error: Missing file - {e}")
            failed += 1
        except Exception as e:
            print(f"   ❌ Error processing session {session_num}: {e}")
            failed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 MIXING COMPLETE!")
    print("=" * 60)
    print(f"✅ Successful: {successful}/10")
    if failed > 0:
        print(f"❌ Failed: {failed}/10")
    print(f"\n📁 Mixed files saved to: {OUTPUT_DIR}")
    print("\n💡 Tip: If music is still too loud/quiet, adjust MUSIC_REDUCTION_DB")
    print("   in the script (currently set to {})".format(MUSIC_REDUCTION_DB))

if __name__ == "__main__":
    main()
