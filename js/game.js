// Core typing engine for one drill run. No DOM/UI knowledge — app.js wires it to the screen.
class TypingEngine {
  constructor(targetText, callbacks) {
    this.targetText = targetText;
    this.index = 0;
    this.correctCount = 0;
    this.errorCount = 0;
    this.startTime = null;
    this.endTime = null;
    this.callbacks = callbacks || {};
  }

  get isComplete() {
    return this.index >= this.targetText.length;
  }

  handleChar(char) {
    if (this.isComplete) return;
    if (this.startTime === null) this.startTime = performance.now();

    const expected = this.targetText[this.index];
    if (char === expected) {
      this.index += 1;
      this.correctCount += 1;
      if (this.isComplete) {
        this.endTime = performance.now();
        this.callbacks.onProgress?.(this.getStats());
        this.callbacks.onComplete?.(this.getStats());
      } else {
        this.callbacks.onProgress?.(this.getStats());
      }
    } else {
      this.errorCount += 1;
      this.callbacks.onError?.(this.getStats());
    }
  }

  getStats() {
    const elapsedMs = this.startTime ? (this.endTime || performance.now()) - this.startTime : 0;
    const minutes = Math.max(elapsedMs / 60000, 1 / 60000); // avoid divide-by-zero on first keystroke
    const wpm = Math.round((this.correctCount / 5) / minutes);
    const totalKeystrokes = this.correctCount + this.errorCount;
    const accuracy = totalKeystrokes === 0 ? 100 : Math.round((this.correctCount / totalKeystrokes) * 100);
    return {
      index: this.index,
      length: this.targetText.length,
      progress: this.targetText.length === 0 ? 1 : this.index / this.targetText.length,
      wpm,
      accuracy,
      errorCount: this.errorCount,
      elapsedMs,
    };
  }
}
