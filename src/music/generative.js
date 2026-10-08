// A palette, not a melody: one low note at a time, with fresh decisions.
const palette = ['E2', 'F2', 'G#2', 'A2', 'B2', 'C3', 'D3', 'E3'];
const range = (random, min, max) => min + random() * (max - min);

export function createNoteGenerator(random = Math.random) {
  let previousIndex = -1;
  return () => {
    let choices = palette
      .map((note, index) => index)
      .filter((index) => index !== previousIndex);
    // Mostly small movements; occasional unexpected leaps.
    if (previousIndex >= 0 && random() < 0.7) {
      choices = choices.filter((index) => Math.abs(index - previousIndex) <= 2);
    }
    const index =
      choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
    previousIndex = index;
    const accented = random() < 0.22;
    return {
      note: palette[index],
      duration: range(random, 0.4, 1.55),
      gap: range(random, 2.4, 6.5),
      velocity: accented ? range(random, 0.72, 0.88) : range(random, 0.38, 0.66),
      detune: range(random, -16, 16),
      modulationIndex: range(random, 2.5, accented ? 11 : 7),
      cutoff: range(random, 420, accented ? 1900 : 1100),
    };
  };
}
