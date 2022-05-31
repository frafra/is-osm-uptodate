export const maxZoom = 19;
export const minZoom = 13;
export const defaultLocation = [17, 45.46423, 9.19073];

export const customAttribution = `<a href="https://github.com/frafra/is-osm-uptodate">${document.title}</a> | <a href="https://api.ohsome.org/">ohsome API</a> | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>`;
export const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const modes = {
  lastedit: {
    getValue: (date) => date * 1000,
    prettyValue: (date) => new Date(date * 1000).toISOString().slice(0, 10),
    worstLabel: 'Least recently updated',
    bestLabel: 'Most recently updated',
  },
  creation: {
    getValue: (date) => date * 1000,
    prettyValue: (date) => new Date(date * 1000).toISOString().slice(0, 10),
    worstLabel: 'Oldest',
    bestLabel: 'Newest',
  },
  revisions: {
    getValue: (version) => version,
    prettyValue: (value) => {
      if (value === 1) {
        return `${value} revision`;
      }
      return `${value} revisions`;
    },
    worstLabel: 'Fewest revisions',
    bestLabel: 'Most revisions',
  },
  frequency: {
    getValue: (updatefrequency) => updatefrequency,
    prettyValue: (value) => {
      const frequency = value.toFixed(2);
      return `${frequency} times/year`;
    },
    worstLabel: 'Least frequently updated',
    bestLabel: 'Most frequently updated',
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
