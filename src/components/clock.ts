import { formatClockTime } from '../utils';
import type { HomeAssistant } from '../types';
import type { SupportedLanguage } from '../internationalization/types';

export class WeatherClock extends HTMLElement {
  private _hass?: HomeAssistant;
  private _locale: SupportedLanguage = 'en';
  private _format: '12h' | '24h' = '24h';
  private _size = 48;
  private _showDate = false;
  private _timeInterval?: number;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  set locale(locale: SupportedLanguage) {
    this._locale = locale;
  }

  set format(format: '12h' | '24h') {
    this._format = format;
  }

  set size(size: number) {
    this._size = size;
  }

  set showDate(show: boolean) {
    this._showDate = show;
  }

  connectedCallback() {
    this._startClock();
    this._render();
  }

  disconnectedCallback() {
    this._stopClock();
  }

  private _startClock() {
    this._stopClock();
    this._timeInterval = window.setInterval(() => this._render(), 1000);
  }

  private _stopClock() {
    if (this._timeInterval !== undefined) {
      clearInterval(this._timeInterval);
      this._timeInterval = undefined;
    }
  }

  private _getDateString(date: Date): string {
    return date.toLocaleDateString(this._locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  private _render() {
    const now = new Date();
    const time = formatClockTime(now, this._format, 'AM', 'PM');

    this.innerHTML = `
      <style>
        .clock-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .clock-time {
          font-size: ${this._size}px;
          font-weight: 300;
          line-height: 1;
          color: var(--primary-text-color, #fff);
        }
        .clock-date {
          font-size: ${Math.max(this._size * 0.45, 12)}px;
          font-weight: 300;
          color: var(--secondary-text-color, rgba(255,255,255,0.7));
          white-space: nowrap;
        }
      </style>
      <div class="clock-container">
        <div class="clock-time">${time}</div>
        ${this._showDate ? `<div class="clock-date">${this._getDateString(now)}</div>` : ''}
      </div>
    `;
  }
}

customElements.define('weather-clock', WeatherClock);
