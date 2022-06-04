import React from 'react';

const classNames = require('classnames');

function Download({ query, customBoundaries }) {
  const urlData = `/api/getData?${query}`;
  const urlStats = `/api/getStats?${query}`;
  if (customBoundaries) {
    return (
      <>
        <p>Only nodes within the GeoJSON areas are considered.</p>
        <form action={urlData} method="POST" className="d-inline">
          <input
            type="text"
            name="geojson"
            value={JSON.stringify(customBoundaries)}
            readOnly
            className="d-none"
          />
          <button className="btn btn-primary" type="submit">
            <i className="fas fa-arrow-alt-circle-down" />
            &nbsp;
            <span>GeoJSON data</span>
          </button>
        </form>
        <form action={urlStats} method="POST" className="d-inline">
          <input
            type="text"
            name="geojson"
            value={JSON.stringify(customBoundaries)}
            readOnly
            className="d-none"
          />
          <button className="btn btn-secondary" type="submit">
            <i className="fas fa-arrow-alt-circle-down" />
            &nbsp;
            <span>Statistics</span>
          </button>
        </form>
      </>
    );
  }
  return (
    <>
      <p>Only nodes within the current view are considered.</p>
      <a
        className={classNames('btn', 'btn-primary', {
          disabled: !query,
        })}
        type="button"
        href={urlData}
      >
        <i className="fas fa-arrow-alt-circle-down" />
        &nbsp;
        <span>GeoJSON data</span>
      </a>
      <a
        className={classNames('btn', 'btn-secondary', {
          disabled: !query,
        })}
        type="button"
        href={urlStats}
      >
        <i className="fas fa-arrow-alt-circle-down" />
        &nbsp;
        <span>Statistics</span>
      </a>
    </>
  );
}

export default Download;
