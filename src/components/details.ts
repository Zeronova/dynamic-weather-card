import { LitElement, html, css, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { getSVGIcon, windDirection } from '../icons/svg-icons.js';
import { formatTime, convertWindSpeed, getWindSpeedUnit } from '../utils.js';
import { i18n } from '../internationalization/index.js';
import type { WeatherData, SunData, DetailsConfig, WeatherEntityAttributes } from '../types.js';

export class WeatherDetails extends LitElement {
  @property({ type: Object }) weather: WeatherData | null = null;
  @property({ type: Object }) sunData: SunData | null = null;
  @property({ type: Object }) config: DetailsConfig | null = null;
  @property({ type: Object }) entityAttributes: WeatherEntityAttributes | null = null;
  @property({ type: Number }) fontSize: number = 13;
  @property({ type: Object }) hass: any = null;

  static styles = css`
    :host {
      display: block;
      --dw-font-size: 13px;
    }

    :host([hidden]) {
      display: none;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      font-size: var(--dw-font-size);
      opacity: 0.9;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-item span:last-child {
      white-space: nowrap;
    }

    .info-icon {
      font-size: 16px;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .info-icon svg {
      width: 20px;
      height: 20px;
      display: block;
    }
  `;

  private hasContent(): boolean {
    if (!this.weather || !this.config) return false;

    return (
      (this.config.showHumidity && this.weather.humidity != null) ||
      (this.hasPrecipitation()) ||
      (this.config.showWind && this.weather.windSpeed != null) ||
      (this.config.showWindDirection && this.weather.windBearing != null) ||
      (this.config.showSunrise && this.sunData?.sunrise != null) ||
      (this.config.showSunset && this.sunData?.sunset != null) ||
      (!!this.config.detailEntity && !!this.hass?.states[this.config.detailEntity]) ||
      (!!this.config.detailEntity2 && !!this.hass?.states[this.config.detailEntity2])
    );
  }

  private getPrecipitationValue(): number | null {
    // Check dedicated precipitation entity first, then weather attribute
    if (this.config?.precipitationEntity && this.hass) {
      const stateObj = this.hass.states[this.config.precipitationEntity];
      if (stateObj && stateObj.state !== 'unavailable' && stateObj.state !== 'unknown') {
        const val = parseFloat(stateObj.state);
        if (!isNaN(val)) return val;
      }
    }
    return this.weather?.precipitation ?? null;
  }

  private getEntityState(entityId: string): string | null {
    const stateObj = this.hass?.states?.[entityId];
    if (!stateObj || stateObj.state === 'unavailable' || stateObj.state === 'unknown') return null;
    return stateObj.state;
  }

  private getPrecipitationUnit(): string {
    if (this.config?.precipitationEntity && this.hass) {
      const stateObj = this.hass.states[this.config.precipitationEntity];
      if (stateObj?.attributes?.unit_of_measurement) {
        return stateObj.attributes.unit_of_measurement;
      }
    }
    const attrs = this.entityAttributes || {};
    return attrs.precipitation_unit || 'mm';
  }

  private hasPrecipitation(): boolean {
    if (this.config?.precipitationEntity && this.hass) {
      const stateObj = this.hass.states[this.config.precipitationEntity];
      return !!(stateObj && stateObj.state !== 'unavailable' && stateObj.state !== 'unknown');
    }
    return this.weather?.precipitation != null;
  }

  private renderHumidity(): TemplateResult {
    if (!this.config?.showHumidity || this.weather?.humidity == null) return html``;

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('humidity')}</span>
        <span>${this.weather.humidity} %</span>
      </div>
    `;
  }

  private renderPrecipitation(): TemplateResult {
    if (!this.config?.showPrecipitation) return html``;
    const value = this.getPrecipitationValue();
    if (value == null) return html``;

    const unit = this.getPrecipitationUnit();

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('humidity')}</span>
        <span>${value} ${unit}</span>
      </div>
    `;
  }

  private renderWind(): TemplateResult {
    if (!this.config?.showWind || this.weather?.windSpeed == null) return html``;

    const attrs = this.entityAttributes || {};
    const speed = convertWindSpeed(this.weather.windSpeed, attrs, this.config.windSpeedUnit);
    const unit = getWindSpeedUnit(attrs, this.config.windSpeedUnit, i18n.t.bind(i18n));

    let gustText = '';
    if (this.config.showWindGust && this.weather.windGust) {
      const gustSpeed = convertWindSpeed(this.weather.windGust, attrs, this.config.windSpeedUnit);
      gustText = ` / ${gustSpeed} ${unit}`;
    }

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('wind')}</span>
        <span>${speed} ${unit}${gustText}</span>
      </div>
    `;
  }

  private renderWindDirection(): TemplateResult {
    if (!this.config?.showWindDirection || this.weather?.windBearing == null) return html``;

    const bearing = this.weather.windBearing;
    const icon = windDirection(bearing);

    // Convert bearing to cardinal direction
    const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    const cardinal = dirs[index];

    return html`
      <div class="info-item">
        <span class="info-icon">${icon}</span>
        <span>${bearing}° ${cardinal}</span>
      </div>
    `;
  }

  private renderSunrise(): TemplateResult {
    if (!this.config?.showSunrise || !this.sunData?.sunrise) return html``;

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('sunrise')}</span>
        <span>${formatTime(this.sunData.sunrise, this.config.clockFormat, i18n.t('am'), i18n.t('pm'))}</span>
      </div>
    `;
  }

  private renderSunset(): TemplateResult {
    if (!this.config?.showSunset || !this.sunData?.sunset) return html``;

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('sunset')}</span>
        <span>${formatTime(this.sunData.sunset, this.config.clockFormat, i18n.t('am'), i18n.t('pm'))}</span>
      </div>
    `;
  }

  private renderDetailEntity(): TemplateResult {
    if (!this.config?.detailEntity || !this.hass) return html``;

    const stateObj = this.hass.states[this.config.detailEntity];
    if (!stateObj || stateObj.state === 'unavailable' || stateObj.state === 'unknown') return html``;

    const name = stateObj.attributes?.friendly_name || this.config.detailEntity;
    const value = stateObj.state;
    const unit = stateObj.attributes?.unit_of_measurement || '';

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('humidity')}</span>
        <span>${value}${unit ? ' ' + unit : ''}</span>
      </div>
    `;
  }

  private renderDetailEntity2(): TemplateResult {
    if (!this.config?.detailEntity2 || !this.hass) return html``;

    const stateObj = this.hass.states[this.config.detailEntity2];
    if (!stateObj || stateObj.state === 'unavailable' || stateObj.state === 'unknown') return html``;

    const name = stateObj.attributes?.friendly_name || this.config.detailEntity2;
    const value = stateObj.state;
    const unit = stateObj.attributes?.unit_of_measurement || '';

    return html`
      <div class="info-item">
        <span class="info-icon">${getSVGIcon('humidity')}</span>
        <span>${value}${unit ? ' ' + unit : ''}</span>
      </div>
    `;
  }

  render(): TemplateResult {
    if (!this.hasContent()) return html``;

    return html`
      <div class="info-grid" style="--dw-font-size: ${this.fontSize}px">
        <!-- Row 1: Humidity, Precipitation, Wind, Wind Direction -->
        ${this.renderHumidity()}
        ${this.renderPrecipitation()}
        ${this.renderWind()}
        ${this.renderWindDirection()}
        <!-- Row 2: Sunrise, Sunset, Detail Entity 1, Detail Entity 2 -->
        ${this.renderSunrise()}
        ${this.renderSunset()}
        ${this.renderDetailEntity()}
        ${this.renderDetailEntity2()}
      </div>
    `;
  }
}

customElements.define('weather-details', WeatherDetails);
