import React from 'react';

import { states } from '../constants';

const classNames = require('classnames');

function Actions({ state, setState }) {
  const busy = state === states.LOADING;
  const loaded = state === states.LOADED;
  return (
    <>
      <button
        id="fetch"
        className={classNames('btn', 'btn-primary', { disabled: busy })}
        type="button"
        onClick={(_) => setState(states.LOADING)}
      >
        <i className="fas fa-sync-alt" />
        &nbsp;
        <span>Show nodes </span>
        <span
          className={classNames('spinner-border', 'spinner-border-sm', {
            'd-none': !busy,
          })}
          role="status"
        />
        <span className="visually-hidden">Loading...</span>
      </button>
      <button
        id="clean"
        className={classNames('btn', 'btn-secondary', { disabled: !loaded })}
        type="button"
        onClick={(_) => setState(states.CLEAN)}
      >
        <i className="fas fa-trash-alt" />
        &nbsp;
        <span>Remove nodes </span>
      </button>
      {state === states.ERROR ? (
        <p>
          Something went wrong! Please try again later or{' '}
          <a href="https://github.com/frafra/is-osm-uptodate/issues/new/choose">
            open a ticket
          </a>
          !
        </p>
      ) : state === states.ERROR_OHSOME ? (
        <p>
          Ohsome API{' '}
          <a href="https://frafra.github.io/ohsome-api-upptime/">
            might not be available at the moment
          </a>
          . Please try again later or{' '}
          <a href="https://github.com/frafra/is-osm-uptodate/issues/new/choose">
            open a ticket
          </a>
          !
        </p>
      ) : (
        ''
      )}
    </>
  );
}

export default Actions;
