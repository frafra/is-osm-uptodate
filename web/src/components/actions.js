import React from 'react';

import { states } from '../constants';

const classNames = require('classnames');

function Actions({ state, setState }) {
  const busy = state === states.LOADING;
  return (
    <button
      id="download"
      className={classNames('btn', 'btn-primary', { disabled: busy })}
      type="button"
      onClick={(_) => setState(states.LOADING)}
    >
      <i className="fas fa-sync-alt" />
      &nbsp;
      <span>Show data</span>
      <span
        className={classNames('spinner-border', 'spinner-border-sm', {
          'd-none': !busy,
        })}
        role="status"
      />
      <span className="visually-hidden">Loading...</span>
    </button>
  );
}

export default Actions;
