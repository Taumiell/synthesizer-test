import * as Tone from 'tone';

// Independent natural time, shared buffer, overlapping fades at the seam.
export class AmbientLoop {
  constructor(url, output, transport) {
    this.transport = transport;
    this.disposed = false;
    this.first = new Tone.Player({ fadeIn: 3, fadeOut: 3 }).connect(output);
    this.ready = this.first.load(url).then(() => {
      if (this.disposed) return;
      this.duration = this.first.buffer.duration;
      this.second = new Tone.Player({
        url: this.first.buffer,
        fadeIn: 3,
        fadeOut: 3,
      }).connect(output);
    });
    this.ready.catch(() => {});
  }
  start() {
    let alternate = false;
    this.event = this.transport.scheduleRepeat(
      (time) => {
        (alternate ? this.second : this.first).start(time, 0, this.duration);
        alternate = !alternate;
      },
      this.duration - 3,
      0,
    );
  }
  stop(time) {
    if (this.event !== undefined) this.transport.clear(this.event);
    this.event = undefined;
    this.first.stop(time);
    this.second?.stop(time);
  }
  dispose() {
    this.disposed = true;
    this.stop(Tone.now());
    this.second?.dispose();
    this.first.dispose();
  }
}
