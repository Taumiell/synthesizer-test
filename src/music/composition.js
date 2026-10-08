export const BPM = 72;
export const LOOP_LENGTH = '16m';

// A quiet harmonic bed under the unpredictable solo voice.
export const droneSequence = [
  { time: '0:0:0', noteName: ['A2', 'E3', 'B3'], duration: '2m', velocity: 0.38 },
  { time: '2:0:0', noteName: ['D3', 'F3', 'E4'], duration: '2m', velocity: 0.35 },
  { time: '4:0:0', noteName: ['F2', 'E3', 'B3'], duration: '2m', velocity: 0.36 },
  { time: '6:0:0', noteName: ['E3', 'G#3', 'F4'], duration: '2m', velocity: 0.32 },
  { time: '8:0:0', noteName: ['A2', 'C3', 'G#3'], duration: '2m', velocity: 0.36 },
  { time: '10:0:0', noteName: ['B2', 'F3', 'A3'], duration: '2m', velocity: 0.33 },
  { time: '12:0:0', noteName: ['D3', 'A3', 'E4'], duration: '2m', velocity: 0.35 },
  { time: '14:0:0', noteName: ['E3', 'G#3', 'F4'], duration: '2m', velocity: 0.32 },
];

export const trackDefinitions = [
  { id: 'piano', name: 'Main Synth', level: 84 },
  { id: 'drone', name: 'Signal Synth', level: 65 },
  { id: 'birds', name: 'Birds Synth', level: 77, gainOffset: 19 },
  { id: 'rain', name: 'Rain Synth', level: 75 },
];
