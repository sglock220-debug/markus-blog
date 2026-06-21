import { getWeatherPlanForWeek, TIME_CONFIG, WEATHER } from './config';

export default class TimeSystem {
  constructor(savedTime = {}) {
    this.realMsPerGameMinute = TIME_CONFIG.realMsPerGameMinute;
    this.elapsedMs = 0;
    this.weatherByDay = { ...(savedTime.weatherByDay || {}) };
    this.totalMinutes = Number.isFinite(savedTime.totalMinutes)
      ? savedTime.totalMinutes
      : this.minutesFromDayTime(TIME_CONFIG.startDay, TIME_CONFIG.startHour, TIME_CONFIG.startMinute);
    this.sleepCallbacks = [];
    this.dayChangeCallbacks = [];
    this.ensureWeatherForDay(this.getDay());
  }

  update(deltaMs) {
    this.elapsedMs += deltaMs;

    while (this.elapsedMs >= this.realMsPerGameMinute) {
      this.elapsedMs -= this.realMsPerGameMinute;
      this.totalMinutes += 1;
      const minuteOfDay = this.totalMinutes % TIME_CONFIG.minutesPerDay;
      if (minuteOfDay === 0) {
        const nextDay = Math.floor(this.totalMinutes / TIME_CONFIG.minutesPerDay) + 1;
        this.totalMinutes = this.minutesFromDayTime(nextDay, TIME_CONFIG.startHour, TIME_CONFIG.startMinute);
        this.ensureWeatherForDay(nextDay);
        this.dayChangeCallbacks.forEach((callback) => callback(nextDay));
        this.sleepCallbacks.forEach((callback) => callback(nextDay));
        break;
      }

      this.ensureWeatherForDay(this.getDay());
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

  getYear() {
    const daysPerYear = TIME_CONFIG.daysPerSeason * TIME_CONFIG.seasons.length;
    return Math.floor((this.getDay() - 1) / daysPerYear) + 1;
  }

  getSeasonIndex() {
    return Math.floor(((this.getDay() - 1) % (TIME_CONFIG.daysPerSeason * TIME_CONFIG.seasons.length)) / TIME_CONFIG.daysPerSeason);
  }

  getSeason() {
    return TIME_CONFIG.seasons[this.getSeasonIndex()];
  }

  getSeasonDay() {
    return ((this.getDay() - 1) % TIME_CONFIG.daysPerSeason) + 1;
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
    const nightStart = 24 * 60;

    if (minutes < duskStart) return 0;
    const progress = Math.min(1, (minutes - duskStart) / (nightStart - duskStart));
    return 0.12 + progress * 0.48;
  }

  onSleep(callback) {
    this.sleepCallbacks.push(callback);
  }

  onDayChange(callback) {
    this.dayChangeCallbacks.push(callback);
  }

  getSnapshot() {
    return {
      totalMinutes: this.totalMinutes,
      day: this.getDay(),
      year: this.getYear(),
      season: this.getSeason(),
      seasonDay: this.getSeasonDay(),
      time: this.getDisplayTime(),
      weather: this.getWeather(),
      weatherByDay: { ...this.weatherByDay }
    };
  }

  ensureWeatherForDay(day) {
    const weekIndex = Math.floor((Math.max(1, day) - 1) / 7);
    const plan = getWeatherPlanForWeek(weekIndex);
    Object.entries(plan).forEach(([planDay, weather]) => {
      this.weatherByDay[planDay] = weather;
    });
    return this.weatherByDay[day] || WEATHER.SUNNY;
  }

  minutesFromDayTime(day, hour, minute) {
    return (day - 1) * TIME_CONFIG.minutesPerDay + hour * 60 + minute;
  }
}
