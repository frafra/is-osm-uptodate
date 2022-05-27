import React from 'react';

const classNames = require('classnames');

function Download({ url }) {
  return (
    <a
      id="download"
      className={classNames('btn', 'btn-primary', {
        disabled: !url,
      })}
      type="button"
      href={url}
    >
      <i className="fas fa-arrow-alt-circle-down" />
      &nbsp;
      <span>Download</span>
    </a>
  );
}

export default Download;
