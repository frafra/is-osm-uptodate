import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

import { states } from './constants';

import Bar from './bar';
import Map from './map';

import './main.css';

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
      <Bar
        setFilter={setFilter}
        mode={mode}
        setMode={setMode}
        percentile={percentile}
        setQuartile={setQuartile}
        url={url}
      />
      <Map
        state={state}
        setState={setState}
        mode={mode}
        percentile={percentile}
        filter={filter}
        setUrl={setUrl}
      />
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));
