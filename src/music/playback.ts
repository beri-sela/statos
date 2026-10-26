import type { Analysis } from './analyze';
import { buildTempoMap, type TempoMap } from './tempo';

export interface Player { stop: () => void }

export interface LiveSource {
  /** Latest analysis and base speed: read continuously, so edits and speed changes apply while playing. */
  get: () => { analysis: Analysis; bpm: number; muted: Set<string> };
}

const LOOKAHEAD = 0.2; // seconds of audio scheduled ahead of time

/**
 * Plays every part with simple Web Audio tones, following the score's tempo map
 * (base speed, ♩ = N marks, rit./accel., fermatas). `onBar` reports the bar being played (−1 when finished).
 */
export function play(source: LiveSource, onBar: (bar: number) => void, fromBar = 0): Player {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  let snapshot = source.get();
  let tempo: TempoMap = buildTempoMap(snapshot.analysis, snapshot.bpm);
  let lastAnalysis = snapshot.analysis, lastBpm = snapshot.bpm;
  let nextTick = tempo.barStarts[Math.min(fromBar, tempo.barStarts.length - 1)] ?? 0;
  let nextTime = ctx.currentTime + 0.1;
  const timeline: [number, number][] = []; // (audio time, tick) pairs for following the cursor
  const voices: OscillatorNode[] = [];

  const refresh = () => {
    snapshot = source.get();
    if (snapshot.analysis !== lastAnalysis || snapshot.bpm !== lastBpm) {
      lastAnalysis = snapshot.analysis; lastBpm = snapshot.bpm;
      tempo = buildTempoMap(snapshot.analysis, snapshot.bpm);
    }
  };

  const scheduleNote = (midi: number, startTick: number, durTicks: number, at: number) => {
    let dur = 0;
    for (let t = startTick; t < startTick + durTicks; t++) dur += tempo.secondsPerTick(t);
    const stop = at + dur;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(1, at + 0.02);
    g.gain.setValueAtTime(1, Math.max(at + 0.02, stop - 0.05));
    g.gain.linearRampToValueAtTime(0, stop - 0.005);
    osc.connect(g).connect(master);
    osc.start(at);
    osc.stop(stop);
    voices.push(osc);
    osc.onended = () => { const i = voices.indexOf(osc); if (i >= 0) voices.splice(i, 1); };
  };

  const step = () => {
    refresh();
    const end = tempo.barStarts[tempo.barStarts.length - 1] ?? 0;
    while (nextTime < ctx.currentTime + LOOKAHEAD && nextTick < end) {
      for (const p of snapshot.analysis.parts) {
        if (snapshot.muted.has(p.doc.id)) continue;
        for (const e of p.events) {
          if (e.midi === null) continue;
          // A note starting here, or (when playback begins mid-note) the rest of a note already sounding.
          if (e.start === nextTick) scheduleNote(e.midi, e.start, e.dur, nextTime);
          else if (timeline.length === 0 && e.start < nextTick && nextTick < e.start + e.dur) {
            scheduleNote(e.midi, nextTick, e.start + e.dur - nextTick, nextTime);
          }
        }
      }
      timeline.push([nextTime, nextTick]);
      nextTime += tempo.secondsPerTick(nextTick);
      nextTick++;
    }
    while (timeline.length > 2 && timeline[1][0] <= ctx.currentTime) timeline.shift();
    const now = timeline.find(([t]) => t >= ctx.currentTime - 0.001) ?? timeline[timeline.length - 1];
    if (nextTick >= end && ctx.currentTime > nextTime + 0.1) { cleanup(); return; }
    if (now) {
      const tick = now[1];
      let b = 0;
      while (b + 1 < tempo.barStarts.length - 1 && tempo.barStarts[b + 1] <= tick) b++;
      onBar(b);
    }
  };

  const timer = window.setInterval(step, 25);
  step();

  let done = false;
  function cleanup() {
    if (done) return;
    done = true;
    window.clearInterval(timer);
    for (const v of voices) { try { v.stop(); } catch { /* already stopped */ } }
    ctx.close();
    onBar(-1);
  }
  return { stop: cleanup };
}
