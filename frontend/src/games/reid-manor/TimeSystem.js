import { getWeatherForDay, TIME_CONFIG, WEATHER } from './config';

export default class TimeSystem {
  constructor(savedTime = {}) {
    this.realMsPerGameMinute = TIME_CONFIG.realMsPerGameMinute;
    this.elapsedMs = 0;
    this.weatherByDay = { ...(savedTime.weatherByDay || {}) };
    this.totalMinutes = Number.isFinite(savedTime.totalMinutes)
      ? savedTime.totalMinutes
      : this.minutesFromDayTime(TIME_CONFIG.startDay, TIME_CONFIG.startHour, TIME_CONFIG.startMinute);
    this.sleepCallbacks = [];
    this.ensureWeatherForDay(this.getDay());
  }

  update(deltaMs) {
    this.elapsedMs += deltaMs;

    while (this.elapsedMs >= this.realMsPerGameMinute) {
      this.elapsedMs -= this.realMsPerGameMinute;
      this.totalMinutes += 1;
      this.ensureWeatherForDay(this.getDay());

      if (this.getHour() >= TIME_CONFIG.sleepHour) {
        this.sleepCallbacks.forEach((callback) => callback());
        break;
      }
    }
  }

  sleepToNextDay() {
    const nextDay = this.getDay() + 1;
    this.totalMinutes = this.minutesFromDayTime(nextDay, TIME_CONFIG.startHour, TIME_CONFIG.startMinute);
    this.elapsedMs = 0;
    this.ensureWeatherForDay(nextDay);
    return nextDay;
  }

  getDay() {
    return Math.floor(this.totalMinutes / TIME_CONFIG.minutesPerDay) + 1;
  }

  getWeekday() {
    return TIME_CONFIG.weekdays[(this.getDay() - 1) % TIME_CONFIG.weekdays.length];
  }

  getHour() {
    return Math.floor((this.totalMinutes % TIME_CONFIG.minutesPerDay) / 60);
  }

  getMinute() {
    return this.totalMinutes % 60;
  }

  getTotalMinutes() {
    return this.totalMinutes;
  }

  getWeather() {
    return this.ensureWeatherForDay(this.getDay());
  }

  getWeatherLabel() {
    return WEATHER.labels[this.getWeather()] || '未知';
  }

  getDisplayTime() {
    const hour = `${this.getHour()}`.padStart(2, '0');
    const minute = `${this.getMinute()}`.padStart(2, '0');
    return `${hour}:${minute}`;
  }

  getNightAlpha() {
    const minutes = this.getHour() * 60 + this.getMinute();
    const duskStart = 18 * 60;
    const nightStart = TIME_CONFIG.sleepHour * 60;

    if (minutes < duskStart) return 0;
    const progress = Math.min(1, (minutes - duskStart) / (nightStart - duskStart));
    return 0.12 + progress * 0.48;
  }

  onSleep(callback) {
    this.sleepCallbacks.push(callback);
  }

  getSnapshot() {
    return {
      totalMinutes: this.totalMinutes,
      day: this.getDay(),
      time: this.getDisplayTime(),
      weather: this.getWeather(),
      weatherByDay: { ...this.weatherByDay }
    };
  }

  ensureWeatherForDay(day) {
    const key = `${day}`;
    if (!this.weatherByDay[key]) {
      this.weatherByDay[key] = getWeatherForDay(day);
    }
    return this.weatherByDay[key];
  }

  minutesFromDayTime(day, hour, minute) {
    return (day - 1) * TIME_CONFIG.minutesPerDay + hour * 60 + minute;
  }
}
