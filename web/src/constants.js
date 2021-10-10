export const maxZoom = 19;
export const defaultLocation = [maxZoom, 45.46423, 9.19073];

export const customAttribution = `<a href="https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date">${document.title}</a> (<a href="https://github.com/frafra/is-osm-uptodate">source code</a> | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>)`;
export const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const states = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};
