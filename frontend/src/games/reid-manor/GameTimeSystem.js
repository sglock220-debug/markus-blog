export default class GameTimeSystem {
  constructor({ realMsPerGameMinute = 1000, startDay = 1, startHour = 6 } = {}) {
    this.realMsPerGameMinute = realMsPerGameMinute;
    this.elapsedMs = 0;
    this.totalMinutes = (startDay - 1) * 24 * 60 + startHour * 60;
    this.previousDay = this.getDay();
    this.dayChangeCallbacks = [];
  }

  update(deltaMs) {
    this.elapsedMs += deltaMs;

    while (this.elapsedMs >= this.realMsPerGameMinute) {
      this.elapsedMs -= this.realMsPerGameMinute;
      this.totalMinutes += 1;

      const day = this.getDay();
      if (day !== this.previousDay) {
        this.previousDay = day;
        this.dayChangeCallbacks.forEach((callback) => callback(day));
      }
    }
  }

  getDay() {
    return Math.floor(this.totalMinutes / (24 * 60)) + 1;
  }

  getHour() {
    return Math.floor((this.totalMinutes % (24 * 60)) / 60);
  }

  getMinute() {
    return this.totalMinutes % 60;
  }

  getTotalMinutes() {
    return this.totalMinutes;
  }

  getDisplayTime() {
    const hour = `${this.getHour()}`.padStart(2, '0');
    const minute = `${this.getMinute()}`.padStart(2, '0');
    return `第 ${this.getDay()} 天 ${hour}:${minute}`;
  }

  onDayChange(callback) {
    this.dayChangeCallbacks.push(callback);
  }
}
