import * as Tone from 'tone';
import {
  BPM,
  LOOP_LENGTH,
  droneSequence,
  trackDefinitions,
} from '../music/composition.js';
import { createNoteGenerator } from '../music/generative.js';
import { AmbientLoop } from './ambient-loop.js';
import {
  initialParameters,
  trackControls,
  normalizeParameter,
} from '../music/controls.js';

// Teacher tutorial_5: source.chain(effects..., channel), separate settings/Parts.
// The graph is persistent; controls and Start never create duplicate voices.
export class SoundWorld {
  constructor() {
    this.playing = false;
    this.disposed = false;
    this.nodes = [];
    this.parts = [];
    this.tracks = {};
    this.voiceNodes = {};
    this.transport = Tone.getTransport();
    this.transport.bpm.value = BPM;
    this.transport.timeSignature = 4;
    this.master = this.keep(new Tone.Gain(0));
    this.limiter = this.keep(new Tone.Limiter(-2));
    this.master.chain(this.limiter, Tone.getDestination());

    for (const definition of trackDefinitions) {
      const parameters = initialParameters(definition.id);
      const channel = this.keep(
        new Tone.Channel({
          volume: -90,
          pan: definition.id === 'piano' ? -0.16 : definition.id === 'drone' ? 0.16 : 0,
        }),
      );
      const meter = this.keep(new Tone.Meter({ normalRange: true, smoothing: 0.8 }));
      channel.connect(this.master);
      channel.connect(meter);
      this.tracks[definition.id] = {
        channel,
        meter,
        parameters,
        level: definition.level,
        muted: false,
        gainOffset: definition.gainOffset ?? -5,
      };
      this.setLevel(definition.id, definition.level, true);
    }

    this.solo = this.keep(
      new Tone.FMSynth({
        volume: -3,
        harmonicity: 1.5,
        modulationIndex: 5,
        oscillator: { type: 'triangle' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.055, decay: 0.8, sustain: 0.16, release: 2.6 },
        modulationEnvelope: { attack: 0.02, decay: 0.6, sustain: 0.18, release: 1.8 },
      }),
    );
    this.soloFilter = this.keep(
      new Tone.Filter({ frequency: 800, type: 'lowpass', Q: 1.4 }),
    );
    const distortion = this.keep(
      new Tone.Distortion({ distortion: 0.18, wet: 0.22, oversample: '2x' }),
    );
    const vibrato = this.keep(
      new Tone.Vibrato({ frequency: 1.3, depth: 0.12, wet: 0.4 }),
    );
    const soloDelay = this.keep(
      new Tone.PingPongDelay({ delayTime: 0.71, feedback: 0.38, wet: 0.3 }),
    );
    const soloReverb = this.keep(
      new Tone.Reverb({ decay: 6.5, preDelay: 0.08, wet: 0.4 }),
    );
    this.solo.chain(
      this.soloFilter,
      distortion,
      vibrato,
      soloDelay,
      soloReverb,
      this.tracks.piano.channel,
    );
    this.voiceNodes.piano = {
      instrument: this.solo,
      filter: this.soloFilter,
      distortion,
      delay: soloDelay,
      reverb: soloReverb,
    };

    this.ambient = [];
    for (const [id, filename] of [
      ['birds', 'forest-birds-long.mp3'],
      ['rain', 'rain-long.mp3'],
    ]) {
      const filter = this.keep(
        new Tone.Filter({
          frequency: this.tracks[id].parameters.cutoff,
          type: 'lowpass',
          Q: 0.7,
        }),
      );
      const delay = this.keep(
        new Tone.PingPongDelay({ delayTime: 0.4, feedback: 0.25, wet: 0 }),
      );
      const reverb = this.keep(
        new Tone.Reverb({ decay: 1.4, wet: this.tracks[id].parameters.reverb }),
      );
      filter.chain(delay, reverb, this.tracks[id].channel);
      const loop = this.keep(
        new AmbientLoop(
          `${import.meta.env.BASE_URL}audio/${filename}`,
          filter,
          this.transport,
        ),
      );
      this.ambient.push(loop);
      this.voiceNodes[id] = { filter, delay, reverb };
    }

    this.drone = this.keep(
      new Tone.PolySynth(Tone.Synth, {
        volume: -8,
        oscillator: { type: 'fatsine', count: 3, spread: 14 },
        envelope: { attack: 2.8, decay: 1.2, sustain: 0.65, release: 3.5 },
      }),
    );
    const droneFilter = this.keep(new Tone.Filter(1300, 'lowpass'));
    const droneChorus = this.keep(
      new Tone.Chorus({ frequency: 0.22, delayTime: 7, depth: 0.65, wet: 0.3 }).start(),
    );
    const droneReverb = this.keep(
      new Tone.Reverb({ decay: 7, preDelay: 0.08, wet: 0.6 }),
    );
    this.drone.chain(droneFilter, droneChorus, droneReverb, this.tracks.drone.channel);
    this.voiceNodes.drone = {
      instrument: this.drone,
      filter: droneFilter,
      chorus: droneChorus,
      reverb: droneReverb,
    };
    this.makePart(this.drone, droneSequence);

    this.ready = Promise.all([
      ...this.ambient.map((loop) => loop.ready),
      ...Object.values(this.voiceNodes).map((nodes) => nodes.reverb.ready),
    ]);
    this.ready.catch(() => {});
  }

  keep(node) {
    this.nodes.push(node);
    return node;
  }

  makePart(instrument, sequence) {
    const part = new Tone.Part((time, note) => {
      instrument.triggerAttackRelease(note.noteName, note.duration, time, note.velocity);
    }, sequence);
    part.loop = true;
    part.loopEnd = LOOP_LENGTH;
    part.start(0);
    this.parts.push(part);
  }

  scheduleSolo(position) {
    this.soloEvent = this.transport.scheduleOnce((time) => {
      if (!this.playing) return;
      const event = this.nextNote();
      const parameters = this.tracks.piano.parameters;
      this.solo.detune.setValueAtTime(event.detune, time);
      this.solo.modulationIndex.setValueAtTime(
        (event.modulationIndex * parameters.fm) / 5,
        time,
      );
      this.soloFilter.frequency.cancelAndHoldAtTime(time);
      const cutoff = Math.max(
        200,
        Math.min(18000, (event.cutoff * parameters.cutoff) / 800),
      );
      this.soloFilter.frequency.setValueAtTime(cutoff, time);
      this.soloFilter.frequency.exponentialRampToValueAtTime(
        Math.max(100, cutoff * 0.35),
        time + event.duration + 1.1,
      );
      this.solo.triggerAttackRelease(event.note, event.duration, time, event.velocity);
      this.scheduleSolo(position + event.gap);
    }, position);
  }

  async start() {
    await Tone.start();
    await this.ready;
    if (this.disposed || this.playing) return;
    const time = Tone.now() + 0.12;
    this.transport.position = 0;
    this.master.gain.cancelScheduledValues(Tone.now());
    this.master.gain.setValueAtTime(0, time);
    this.master.gain.linearRampToValueAtTime(0.7, time + 0.7);
    this.playing = true;
    this.nextNote = createNoteGenerator();
    this.scheduleSolo(0);
    this.ambient.forEach((loop) => loop.start());
    this.transport.start(time);
  }

  stop() {
    if (!this.playing) return;
    const now = Tone.now();
    this.master.gain.cancelAndHoldAtTime(now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.08);
    this.transport.stop(now + 0.08);
    this.transport.clear(this.soloEvent);
    this.solo.triggerRelease(now);
    this.drone.releaseAll(now);
    this.ambient.forEach((loop) => loop.stop(now + 0.08));
    this.playing = false;
  }

  setLevel(id, level, immediate = false) {
    const track = this.tracks[id];
    track.level = Math.max(0, Math.min(100, Number(level)));
    const amplitude = track.muted ? 0 : (track.level / 100) ** 2;
    const decibels = amplitude === 0 ? -90 : Tone.gainToDb(amplitude) + track.gainOffset;
    if (immediate) track.channel.volume.value = decibels;
    else track.channel.volume.rampTo(decibels, 0.06);
  }

  setMuted(id, muted) {
    this.tracks[id].muted = muted;
    this.setLevel(id, this.tracks[id].level);
  }

  setParameter(id, key, requested) {
    const track = this.tracks[id];
    const control = trackControls[id]?.find((item) => item.key === key);
    if (!control) return;
    const value = normalizeParameter(control, requested);
    track.parameters[key] = value;
    const nodes = this.voiceNodes[id];
    if (key === 'waveform') nodes.instrument.set({ oscillator: { type: value } });
    else if (key === 'attack' || key === 'release')
      nodes.instrument.set({ envelope: { [key]: value } });
    else if (key === 'spread') nodes.instrument.set({ oscillator: { spread: value } });
    else if (key === 'fm') this.solo.modulationIndex.rampTo(value, 0.06);
    else if (key === 'cutoff') {
      nodes.filter.frequency.cancelAndHoldAtTime(Tone.now());
      nodes.filter.frequency.rampTo(value, 0.08);
    } else if (key === 'distortion') nodes.distortion.distortion = value;
    else if (['delay', 'reverb', 'chorus'].includes(key))
      nodes[key].wet.rampTo(value, 0.06);
  }

  getLevels() {
    return Object.fromEntries(
      Object.entries(this.tracks).map(([id, track]) => {
        const value = track.meter.getValue();
        return [
          id,
          this.playing && !track.muted
            ? Array.isArray(value)
              ? Math.max(...value)
              : value
            : 0,
        ];
      }),
    );
  }

  getPosition() {
    if (!this.playing) return null;
    const [bar, beat] = this.transport.position.split(':').map(Number);
    return { bar: (bar % Number.parseInt(LOOP_LENGTH, 10)) + 1, beat: beat + 1 };
  }

  dispose() {
    this.stop();
    this.disposed = true;
    this.parts.forEach((part) => part.dispose());
    this.nodes
      .slice()
      .reverse()
      .forEach((node) => node.dispose());
  }
}
