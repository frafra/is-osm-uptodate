import React from 'react';

const classNames = require('classnames');

function Download({ query }) {
  const urlData = `/api/getData?${query}`;
  const urlStats = `/api/getStats?${query}`;
  return (
    <>
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
