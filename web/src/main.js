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
    tracesSampleRate: 1.0,
    release: RELEASE, // eslint-disable-line no-undef
  });
}

function App() {
  const [loading, setLoading] = useState(false);
  const [bounds, setBounds] = useState();
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState('lastedit');
  const [percentile, setPercentile] = useState(50);
  const [url, setUrl] = useState();
  const [statistics, setStatistics] = useState({});
  const [showBarIfSmall, setShowBarIfSmall] = useState(false);

  useEffect(() => {
    if (bounds) {
      const query = new URLSearchParams({
        minx: bounds.getWest(),
        miny: bounds.getSouth(),
        maxx: bounds.getEast(),
        maxy: bounds.getNorth(),
        filter,
      }).toString();
      setUrl(`/api/getStats?${query}`);
    }
  }, [bounds, filter]);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return response.text().then((text) => {
          throw new Error(text);
        });
      })
      .then((parsed) => {
        setLoading(false);
        setStatistics(parsed);
      })
      .catch((error) => {
        setLoading(false);
        throw new Error(error);
      });
  }, [url]);

  let range;
  if (Object.keys(statistics).length && mode) {
    range = [statistics[mode].min, statistics[mode].max];
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
          mode={mode}
          setMode={setMode}
          percentile={percentile}
          setPercentile={setPercentile}
          statistics={statistics}
          url={url}
          className={classNames({ 'hide-if-small': !showBarIfSmall })}
        />
        <Map
          bounds={bounds}
          setBounds={setBounds}
          mode={mode}
          filter={filter}
          percentile={percentile}
          range={range}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));
