import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

import Bar from './bar';
import Map from './map';

import './main.css';

const classNames = require('classnames');

// eslint-disable-next-line no-undef
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN, // eslint-disable-line no-undef
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.1,
    release: RELEASE, // eslint-disable-line no-undef
  });
}

function App() {
  const [loadingStats, setLoadingStats] = useState(0);
  const [bounds, setBounds] = useState();
  const [customBoundaries, setCustomBoundaries] = useState();
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState('lastedit');
  const [percentile, setPercentile] = useState(50);
  const [query, setQuery] = useState();
  const [statistics, setStatistics] = useState({});
  const [showBarIfSmall, setShowBarIfSmall] = useState(false);

  useEffect(() => {
    let params = {};
    if (bounds && !customBoundaries) {
      params = {
        minx: bounds.getWest(),
        miny: bounds.getSouth(),
        maxx: bounds.getEast(),
        maxy: bounds.getNorth(),
      };
    }
    if (filter) {
      params.filter = filter;
    }
    const newQuery = new URLSearchParams(params).toString();
    if (query !== newQuery) setQuery(newQuery);
  }, [bounds, filter, customBoundaries]);

  useEffect(() => {
    if (!(query || customBoundaries)) return;
    let fetchOptions = {};
    if (customBoundaries) {
      const formData = new FormData();
      formData.append('geojson', JSON.stringify(customBoundaries));
      fetchOptions = { method: 'POST', body: formData };
    }
    setLoadingStats((counter) => counter + 1);
    fetch(`/api/getStats?${query}`, fetchOptions)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return response.text().then((text) => {
          throw new Error(text);
        });
      })
      .then((parsed) => {
        setLoadingStats((counter) => counter - 1);
        setStatistics(parsed);
      })
      .catch((error) => {
        setLoadingStats((counter) => counter - 1);
        throw new Error(error);
      });
  }, [query]);

  let range;
  if (Object.keys(statistics).length && mode) {
    if (statistics[mode].nodes >= 2) {
      range = [statistics[mode].min, statistics[mode].max];
    }
  }

  return (
    <>
      <ul id="nav" className="nav nav-tabs justify-content-center">
        <li className="nav-item">
          <button
            type="button"
            className={classNames('nav-link', { active: showBarIfSmall })}
            onClick={() => setShowBarIfSmall(true)}
          >
            Settings
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={classNames('nav-link', { active: !showBarIfSmall })}
            onClick={() => setShowBarIfSmall(false)}
          >
            Map
          </button>
        </li>
      </ul>
      <div id="tab-container">
        <Bar
          setFilter={setFilter}
          customBoundaries={customBoundaries}
          setCustomBoundaries={setCustomBoundaries}
          mode={mode}
          setMode={setMode}
          percentile={percentile}
          setPercentile={setPercentile}
          statistics={statistics}
          query={query}
          className={classNames({ 'hide-if-small': !showBarIfSmall })}
        />
        <Map
          bounds={bounds}
          setBounds={setBounds}
          customBoundaries={customBoundaries}
          mode={mode}
          filter={filter}
          percentile={percentile}
          range={range}
          loadingStats={loadingStats}
        />
      </div>
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));
