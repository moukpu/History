import {
  clearPeriodSvgMap,
  mountPeriodSvgMap,
  updatePeriodSvgMapState,
} from "./period-svg-map.js";

export function clearModernSvgMap(container) {
  clearPeriodSvgMap(container);
}

export function mountModernSvgMap(container, onCitySelect) {
  return mountPeriodSvgMap(container, "modern_2025", onCitySelect);
}

export function updateModernSvgMapState(container, state) {
  updatePeriodSvgMapState(container, state);
}
