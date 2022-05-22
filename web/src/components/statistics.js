import React from 'react';

import { maxZoom, states } from '../constants';

function flyAndOpen(marker, event) {
  const { map } = marker;
  map.once('moveend zoomend', (_) => marker.openPopup());
  map.flyTo(marker._latlng, maxZoom);
}

function Statistics({ statistics, state }) {
  return (
    <>
      {(Object.keys(statistics).length == 0) && (state = states.LOADED) && (
        <p>
          No statistics to show. Zoom in to get some statistics.
        </p>
      )}
      <table className="table table-striped">
        <tbody>
          {Object.keys(statistics).map((key) => (
            <tr key={key}>
              <th scope="row">{statistics[key].label}</th>
              <td>
                <button
                  className="btn btn-link p-0"
                  type="button"
                  onClick={flyAndOpen.bind(null, statistics[key].marker)}
                >
                  {statistics[key].osmid}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default Statistics;
