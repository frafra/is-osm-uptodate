import React from 'react';

const classNames = require('classnames');

function Download({ downloadLink }) {
  return (
    <a
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
    </a>
  );
}

export default Download;
