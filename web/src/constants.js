export const maxZoom = 19;
export const defaultLocation = [maxZoom, 45.46423, 9.19073];

export const customAttribution = `<a href="https://github.com/frafra/is-osm-uptodate">${document.title}</a> | <a href="https://api.ohsome.org/">ohsome API</a> | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>`;
export const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const states = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  ERROR_OHSOME: 'error_ohsome',
};

// prettier-ignore
export const valuesBlacklist = new RegExp (''
  + '^('
  +  '('
  +   '(.*_)?name'
  +   '|addr'
  +   '|brand'
  +   '|capacity'
  +   '|comment'
  +   '|contact'
  +   '|email'
  +   '|fax'
  +   '|fixme'
  +   '|layer'
  +   '|level'
  +   '|mapillary'
  +   '|network'
  +   '|opening_hours'
  +   '|operator'
  +   '|phone'
  +   '|(route_)?ref'
  +   '|source'
  +   '|species'
  +   '|survey'
  +   '|website'
  +  ')(:.*)?'
  + ')|('
  +  '.*:('
  +   'wiki(data|pedia)'
  +  ')'
  + ')$'
);
