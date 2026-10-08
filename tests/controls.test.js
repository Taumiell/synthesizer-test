import test from 'node:test';
import assert from 'node:assert/strict';
import {
  trackControls,
  initialParameters,
  normalizeParameter,
} from '../src/music/controls.js';
import { trackDefinitions } from '../src/music/composition.js';

test('every track has unique controls and initial values within their ranges', () => {
  assert.equal(trackDefinitions.length, 4);
  for (const track of trackDefinitions) {
    const controls = trackControls[track.id];
    assert.equal(new Set(controls.map((control) => control.key)).size, controls.length);
    for (const control of controls)
      assert.equal(normalizeParameter(control, control.value), control.value);
    assert.equal(Object.keys(initialParameters(track.id)).length, controls.length);
  }
});

test('invalid input cannot send out-of-range values to audio parameters', () => {
  const cutoff = trackControls.birds.find((control) => control.key === 'cutoff');
  assert.equal(normalizeParameter(cutoff, -1), 200);
  assert.equal(normalizeParameter(cutoff, 1000000), 18000);
  assert.equal(normalizeParameter(cutoff, NaN), 18000);
  const wave = trackControls.piano.find((control) => control.key === 'waveform');
  assert.equal(normalizeParameter(wave, 'invalid'), wave.value);
});
