import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

import { states } from './constants';

import Bar from './bar';
import Map from './map';

import './main.css';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 1.0,
    release: RELEASE,
  });
}

function App() {
  const [state, setState] = useState();
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState('lastedit');
  const [percentile, _setPercentile] = useState(50);
  function setPercentile(value) {
    value = parseInt(value.slice(9)) * 25;
    _setPercentile(value);
  }
  const [statistics, setStatistics] = useState({});
  const [downloadLink, setDownloadLink] = useState();

  useEffect(() => {
    switch (state) {
      case states.LOADING:
        break;
      case states.ERROR:
        setStatistics({});
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
        state={state}
        setState={setState}
        setFilter={setFilter}
        mode={mode}
        setMode={setMode}
        percentile={percentile}
        setPercentile={setPercentile}
        statistics={statistics}
        downloadLink={downloadLink}
      />
      <Map
        state={state}
        setState={setState}
        mode={mode}
        percentile={percentile}
        filter={filter}
        setStatistics={setStatistics}
        setDownloadLink={setDownloadLink}
      />
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));
