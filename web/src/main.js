import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

import { states } from './constants';

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
  const [state, setState] = useState();
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState('lastedit');
  const [percentile, setPercentile] = useState(50);
  function setQuartile(quartile) {
    const newPercentile = parseInt(quartile.slice(9), 10) * 25;
    setPercentile(newPercentile);
  }
  const [url, setUrl] = useState();
  const [showBarIfSmall, setShowBarIfSmall] = useState(false);

  useEffect(() => {
    switch (state) {
      case states.LOADING:
        break;
      case states.ERROR:
        break;
      case states.LOADED:
      default:
        break;
    }
    return null;
  }, [state]);

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
          setQuartile={setQuartile}
          url={url}
          className={classNames({ 'hide-if-small': !showBarIfSmall })}
        />
        <Map
          state={state}
          setState={setState}
          mode={mode}
          percentile={percentile}
          filter={filter}
          setUrl={setUrl}
        />
      </div>
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));
