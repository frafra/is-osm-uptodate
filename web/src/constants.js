export const maxZoom = 19;
export const minZoom = 13;
export const defaultLocation = [17, 45.46423, 9.19073];

export const customAttribution = `<a href="https://github.com/frafra/is-osm-uptodate">${document.title}</a> | <a href="https://api.ohsome.org/">ohsome API</a> | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>`;
export const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const dataTileURL = 'tiles/{z}/{x}/{y}.png';

export const states = {
  CLEAN: 'clean',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  ERROR_OHSOME: 'error_ohsome',
};

export const modes = {
  lastedit: {
    defaultWorstValue: Date.parse('01 Jan 2010 00:00:00'),
    defaultBestValue: new Date().getTime(),
    getValue: (feature) => new Date(feature.properties.lastedit).getTime(),
    prettyValue: (date) => new Date(date).toISOString().slice(0, 10),
    inverted: false,
    worstLabel: 'least recently updated',
    bestLabel: 'most recently updated',
  },
  creation: {
    defaultWorstValue: Date.parse('01 Jan 2010 00:00:00'),
    defaultBestValue: new Date().getTime(),
    getValue: (feature) => new Date(feature.properties.created).getTime(),
    prettyValue: (date) => new Date(date).toISOString().slice(0, 10),
    inverted: false,
    worstLabel: 'oldest',
    bestLabel: 'newest',
  },
  revisions: {
    defaultWorstValue: 1,
    defaultBestValue: 10,
    getValue: (feature) => feature.properties.version,
    prettyValue: (value) => value,
    inverted: false,
    worstLabel: 'fewest revisions',
    bestLabel: 'most revisions',
  },
  frequency: {
    defaultWorstValue: 700,
    defaultBestValue: 7,
    getValue: (feature) => feature.properties.average_update_days,
    prettyValue: (value) => {
      const days = Math.floor(value);
      if (days < 1) return 'daily';
      if (days < 365) return `every ${days} days`;
      const years = Math.floor(value / 365);
      return `every ${years} year(s)`;
    },
    inverted: true,
    worstLabel: 'least frequently updated',
    bestLabel: 'most frequently updated',
  },
};

// prettier-ignore
export const valuesBlacklist = new RegExp (''
  + '^(.*:)*('
  +   '(.*_)?name'
  +   '|addr'
  +   '|brand'
  +   '|capacity'
  +   '|comment'
  +   '|contact'
  +   '|description'
  +   '|email'
  +   '|fax'
  +   '|fixme'
  +   '|image'
  +   '|layer'
  +   '|level'
  +   '|mapillary'
  +   '|network'
  +   '|note'
  +   '|opening_hours'
  +   '|operator'
  +   '|phone'
  +   '|(.*_)?ref'
  +   '|(.*_)*source'
  +   '|species'
  +   '|survey'
  +   '|wikidata'
  +   '|wikipedia'
  +   '|website'
  + ')(:.*)*$'
);
