import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { states } from './constants';

import Bar from './bar';
import Map from './map';

import './main.css';

function App() {
  const [state, setState] = useState();
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState('lastedit');
  const [percentile, _setPercentile] = useState(50);
  function setPercentile(value) {
    value = parseInt(value.slice(9)) * 25;
    console.log(value);
    _setPercentile(value);
  }
  const [bounds, setBounds] = useState();
  const [boundsLoaded, setBoundsLoaded] = useState();
  const [geojson, setGeojson] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [downloadLink, setDownloadLink] = useState();

  useEffect(() => {
    if (bounds) {
      var url = `/api/getData?minx=${bounds.getWest()}&miny=${bounds.getSouth()}&maxx=${bounds.getEast()}&maxy=${bounds.getNorth()}`;
    } else {
      var url = null;
    }
    switch (state) {
      case states.LOADING:
        if (filter.trim().length > 0) url += `&filter=${filter}`;
        setBoundsLoaded(bounds);
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
            setGeojson(parsed);
            setState(states.LOADED);
          })
          .catch((error) => {
            if (error.message === 'ohsome') {
              setState(states.ERROR_OHSOME);
            } else {
              console.log(error);
              setState(states.ERROR);
            }
          });
        break;
      case states.ERROR:
      case states.CLEAN:
        setBoundsLoaded();
        setStatistics({});
        break;
      case states.LOADED:
      default:
        break;
    }
    setDownloadLink(url);
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
        setBounds={setBounds}
        boundsLoaded={boundsLoaded}
        geojson={geojson}
        setStatistics={setStatistics}
      />
    </>
  );
}
ReactDOM.render(<App />, document.getElementById('root'));
