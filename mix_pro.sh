#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Sofa2Slugger — Professional Audio Mixing Pipeline
# ─────────────────────────────────────────────────────────────
#  Broadcast-quality voice-over-music mixing using ffmpeg.
#
#  Signal chain:
#    Voice  → EQ (clarity)
#    Music  → loop → EQ (1-4 kHz carve) → sidechain duck under voice
#    Sum    → voice + ducked music → concat with intro/outro
#    Master → two-pass EBU R128 loudnorm (-16 LUFS, -1 dBTP)
#
#  Usage:
#    ./mix_pro.sh           # all 10 sessions
#    ./mix_pro.sh 1         # session 1 only
#
#  Requires: ffmpeg >= 3.1 (apt install ffmpeg)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

AUDIO_BASE="$HOME/Sofa2Slugger-v2/assets/audio"
OUTPUT_DIR="$AUDIO_BASE/mixed_sessions"
SR=44100

# ── Gain ────────────────────────────────────────────────────
VOICE_GAIN=9          # dB boost for voice tracks
MUSIC_GAIN=-30        # dB reduction for music

# ── Voice EQ ─────────────────────────────────────────────────
#  HP 80 Hz     remove rumble
#  -3 dB @ 200  reduce mud
#  +4 dB @ 2.5k presence / clarity
#  +2 dB @ 8k   air / intelligibility
VOICE_EQ="highpass=f=80,equalizer=f=200:t=q:w=1:g=-3,equalizer=f=2500:t=q:w=1.5:g=4,equalizer=f=8000:t=q:w=1:g=2,volume=${VOICE_GAIN}dB"

# ── Music EQ (carve voice presence band) ─────────────────────
#  Three overlapping cuts across 1-4 kHz
MUSIC_EQ="volume=${MUSIC_GAIN}dB,equalizer=f=1500:t=q:w=0.8:g=-6,equalizer=f=2500:t=q:w=1:g=-8,equalizer=f=3500:t=q:w=0.8:g=-6"

# ── Sidechain compression ────────────────────────────────────
SC_THRESH=0.02    # low threshold — duck on any voice
SC_RATIO=8        # heavy ducking
SC_ATTACK=5       # ms — fast onset
SC_RELEASE=200    # ms — smooth recovery

# ── Loudness target ──────────────────────────────────────────
LU_I=-16          # LUFS integrated
LU_TP=-1          # dB true peak
LU_LRA=11         # loudness range

# ── Bell timestamps (seconds from start of final mix) ────────
BELLS_9="345 405 435 495 520 580"   # 5:45 6:45 7:15 8:15 8:40 9:40
BELLS_10="332 512"                   # 5:32 8:32

# ─────────────────────────────────────────────────────────────

log()  { printf '  %s\n' "$*"; }
step() { printf '  [%s] %s\n' "$1" "$2"; }

# Two-pass EBU R128 loudness normalization (dynamic mode for
# accurate true-peak control)
loudnorm_2pass() {
    local src="$1" dst="$2"

    # Pass 1 — measure
    local json
    json=$(ffmpeg -hide_banner -v info -i "$src" \
        -af "loudnorm=I=${LU_I}:TP=${LU_TP}:LRA=${LU_LRA}:print_format=json" \
        -f null /dev/null 2>&1 | sed -n '/{/,/}/p')

    local mI mTP mLRA mTh off
    mI=$(  echo "$json" | grep -oP '"input_i"\s*:\s*"\K[^"]+')
    mTP=$( echo "$json" | grep -oP '"input_tp"\s*:\s*"\K[^"]+')
    mLRA=$(echo "$json" | grep -oP '"input_lra"\s*:\s*"\K[^"]+')
    mTh=$( echo "$json" | grep -oP '"input_thresh"\s*:\s*"\K[^"]+')
    off=$( echo "$json" | grep -oP '"target_offset"\s*:\s*"\K[^"]+')

    # Pass 2 — apply (dynamic mode for reliable TP ceiling)
    ffmpeg -y -hide_banner -v warning -i "$src" \
        -af "loudnorm=I=${LU_I}:TP=${LU_TP}:LRA=${LU_LRA}:\
measured_I=${mI}:measured_TP=${mTP}:measured_LRA=${mLRA}:\
measured_thresh=${mTh}:offset=${off}" \
        -ar "$SR" "$dst"
}

process_session() {
    local num=$1
    local pad
    pad=$(printf '%02d' "$num")
    local sdir="$AUDIO_BASE/session-${pad}"
    local tmp
    tmp=$(mktemp -d)

    printf '\n══════════════════════════════════════════════\n'
    printf '  Session %d\n' "$num"
    printf '══════════════════════════════════════════════\n'

    # Verify source files
    for f in intro.mp3 training.mp3 music.mp3 outro.mp3; do
        [[ -f "$sdir/$f" ]] || { log "MISSING: $sdir/$f"; rm -rf "$tmp"; return 1; }
    done

    local train_dur
    train_dur=$(ffprobe -v quiet -show_entries format=duration \
        -of csv=p=0 "$sdir/training.mp3")
    log "Training duration: ${train_dur}s"

    # ── 1. Voice EQ ──────────────────────────────────────
    step "1/5" "Voice EQ  →  HP 80, +4 dB @ 2.5 kHz, +2 dB @ 8 kHz"
    ffmpeg -y -hide_banner -v warning \
        -i "$sdir/intro.mp3" -af "$VOICE_EQ" -ac 1 -ar "$SR" "$tmp/intro_eq.wav"
    ffmpeg -y -hide_banner -v warning \
        -i "$sdir/training.mp3" -af "$VOICE_EQ" -ac 1 -ar "$SR" "$tmp/training_eq.wav"
    ffmpeg -y -hide_banner -v warning \
        -i "$sdir/outro.mp3" -af "$VOICE_EQ" -ac 1 -ar "$SR" "$tmp/outro_eq.wav"

    # ── 2. Music: loop + EQ carve + sidechain ────────────
    step "2/5" "Music  →  loop, EQ carve 1-4 kHz, sidechain ${SC_RATIO}:1"
    ffmpeg -y -hide_banner -v warning \
        -stream_loop -1 -i "$sdir/music.mp3" \
        -af "atrim=0:${train_dur},asetpts=PTS-STARTPTS,${MUSIC_EQ}" \
        -ac 1 -ar "$SR" "$tmp/music_eq.wav"

    ffmpeg -y -hide_banner -v warning \
        -i "$tmp/music_eq.wav" \
        -i "$tmp/training_eq.wav" \
        -filter_complex \
            "[0:a][1:a]sidechaincompress=\
threshold=${SC_THRESH}:ratio=${SC_RATIO}:\
attack=${SC_ATTACK}:release=${SC_RELEASE}:level_sc=1[out]" \
        -map "[out]" "$tmp/music_ducked.wav"

    # ── 3. Mix voice + ducked music ──────────────────────
    step "3/5" "Sum voice + ducked music"
    ffmpeg -y -hide_banner -v warning \
        -i "$tmp/training_eq.wav" \
        -i "$tmp/music_ducked.wav" \
        -filter_complex \
            "[0:a][1:a]amix=inputs=2:duration=first:normalize=0[out]" \
        -map "[out]" "$tmp/training_mix.wav"

    # ── 4. Concatenate sections ──────────────────────────
    step "4/5" "Concatenate  →  intro + training(+music) + outro"
    cat > "$tmp/concat.txt" <<CONCATLIST
file '${tmp}/intro_eq.wav'
file '${tmp}/training_mix.wav'
file '${tmp}/outro_eq.wav'
CONCATLIST
    ffmpeg -y -hide_banner -v warning \
        -f concat -safe 0 -i "$tmp/concat.txt" \
        "$tmp/full.wav"

    # Bell overlays (sessions 9 & 10 only)
    local bells=""
    [[ "$num" -eq 9  ]] && bells="$BELLS_9"
    [[ "$num" -eq 10 ]] && bells="$BELLS_10"

    if [[ -n "$bells" ]]; then
        local bell_src="$AUDIO_BASE/Golden_Box/bell"
        if [[ -f "$bell_src" ]]; then
            ffmpeg -y -hide_banner -v warning -i "$bell_src" \
                -af "atrim=0:0.5,asetpts=PTS-STARTPTS" \
                -ac 1 -ar "$SR" "$tmp/bell.wav"
            local cur="$tmp/full.wav" idx=0
            for ts in $bells; do
                local nxt="$tmp/bell_${idx}.wav"
                local ms=$(( ts * 1000 ))
                ffmpeg -y -hide_banner -v warning \
                    -i "$cur" -i "$tmp/bell.wav" \
                    -filter_complex \
                        "[1:a]adelay=${ms}|${ms}[b];\
[0:a][b]amix=inputs=2:duration=first:normalize=0[out]" \
                    -map "[out]" "$nxt"
                cur="$nxt"
                idx=$((idx + 1))
            done
            cp "$cur" "$tmp/full.wav"
            log "Added $idx bell overlays"
        fi
    fi

    # ── 5. Master loudness — two-pass EBU R128 ───────────
    step "5/5" "Master loudnorm  →  ${LU_I} LUFS, TP ${LU_TP} dB"
    loudnorm_2pass "$tmp/full.wav" "$tmp/master.wav"

    # ── Export WAV + MP3 ─────────────────────────────────
    mkdir -p "$OUTPUT_DIR"
    cp "$tmp/master.wav" "$OUTPUT_DIR/session-${pad}-mixed.wav"
    ffmpeg -y -hide_banner -v warning -i "$tmp/master.wav" \
        -codec:a libmp3lame -b:a 192k \
        "$OUTPUT_DIR/session-${pad}-mixed.mp3"

    log ""
    log "WAV → $OUTPUT_DIR/session-${pad}-mixed.wav"
    log "MP3 → $OUTPUT_DIR/session-${pad}-mixed.mp3"

    # ── Verification (ebur128 for accurate measurement) ──
    log ""
    log "── Loudness verification ──"
    local verify
    verify=$(ffmpeg -hide_banner -nostats -i "$OUTPUT_DIR/session-${pad}-mixed.wav" \
        -filter_complex "ebur128=peak=true" \
        -f null /dev/null 2>&1)
    echo "$verify" | grep -E "^\s+I:" | tail -1 | sed 's/^/    /'
    echo "$verify" | grep -E "^\s+LRA:" | tail -1 | sed 's/^/    /'
    echo "$verify" | grep -E "^\s+Peak:" | tail -1 | sed 's/^/    /'

    local wav_size mp3_size dur
    wav_size=$(du -h "$OUTPUT_DIR/session-${pad}-mixed.wav" | cut -f1)
    mp3_size=$(du -h "$OUTPUT_DIR/session-${pad}-mixed.mp3" | cut -f1)
    dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 \
        "$OUTPUT_DIR/session-${pad}-mixed.wav")
    log "Duration: ${dur}s  |  WAV: ${wav_size}  |  MP3: ${mp3_size}"
    log "Done."

    # Cleanup
    rm -rf "$tmp"
}

# ── Main ─────────────────────────────────────────────────────
printf '══════════════════════════════════════════════\n'
printf '  Sofa2Slugger Professional Audio Mixer\n'
printf '══════════════════════════════════════════════\n'
printf '  Target: %d LUFS integrated, %d dB true peak\n' "$LU_I" "$LU_TP"
printf '  Voice: +%d dB gain, EQ (HP 80, presence +4, air +2)\n' "$VOICE_GAIN"
printf '  Music: %d dB gain, 1-4 kHz carve, sidechain %d:1\n' "$MUSIC_GAIN" "$SC_RATIO"
printf '══════════════════════════════════════════════\n'

mkdir -p "$OUTPUT_DIR"

if [[ $# -ge 1 ]]; then
    process_session "$1"
else
    for i in $(seq 1 10); do
        process_session "$i" || log "Session $i FAILED — continuing..."
    done
fi

printf '\n══════════════════════════════════════════════\n'
printf '  All done.\n'
printf '══════════════════════════════════════════════\n'
