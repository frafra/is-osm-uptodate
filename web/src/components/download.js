import React from 'react';

const classNames = require('classnames');

function Download({ downloadLink }) {
  return (
    <>
      {!downloadLink && (
        <p>
          No data to download. Click on <i>Show nodes</i> to fetch some data
          first.
        </p>
      )}
      <button
        id="download"
        className={classNames('btn', 'btn-primary', {
          disabled: !downloadLink,
        })}
        type="button"
        href={downloadLink}
      >
        <i className="fas fa-arrow-alt-circle-down" />
        &nbsp;
        <span>Download</span>
      </button>
    </>
  );
}

export default Download;
