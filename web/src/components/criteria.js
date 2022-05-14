import React from 'react';

import { modes } from '../constants';

function ButtonCheckbox({ id, children, mode, setMode, name }) {
  const checked = id === mode;
  return (
    <>
      <input
        type="radio"
        className="btn-check"
        name={name}
        id={id}
        autoComplete="off"
        checked={checked}
        onChange={(e) => setMode(e.target.id)}
      />
      <label className="btn btn-outline-primary" htmlFor={id}>
        {children}
      </label>
    </>
  );
}

function Mode({ mode, setMode }) {
  return (
    <div id="mode" className="btn-group-vertical btn-group-toggle" role="group">
      <ButtonCheckbox id="creation" mode={mode} setMode={setMode} name="mode">
        <i className="fas fa-fast-backward" /> First edit
      </ButtonCheckbox>
      <ButtonCheckbox id="lastedit" mode={mode} setMode={setMode} name="mode">
        <i className="fas fa-fast-forward" /> Last edit
      </ButtonCheckbox>
      <ButtonCheckbox id="revisions" mode={mode} setMode={setMode} name="mode">
        <i className="fas fa-clone" /> Revisions
      </ButtonCheckbox>
      <ButtonCheckbox id="frequency" mode={mode} setMode={setMode} name="mode">
        <i className="fas fa-stopwatch" /> Update frequency
      </ButtonCheckbox>
    </div>
  );
}

function Percentile({ percentile, setPercentile }) {
  percentile = `quartile-${percentile / 25}`;
  return (
    <div
      id="percentile"
      className="btn-group-vertical btn-group-toggle"
      role="group"
    >
      <ButtonCheckbox
        id="quartile-0"
        mode={percentile}
        setMode={setPercentile}
        name="percentile"
      >
        Minimum
      </ButtonCheckbox>
      <ButtonCheckbox
        id="quartile-1"
        mode={percentile}
        setMode={setPercentile}
        name="percentile"
      >
        1st quartile
      </ButtonCheckbox>
      <ButtonCheckbox
        id="quartile-2"
        mode={percentile}
        setMode={setPercentile}
        name="percentile"
      >
        Median
      </ButtonCheckbox>
      <ButtonCheckbox
        id="quartile-3"
        mode={percentile}
        setMode={setPercentile}
        name="percentile"
      >
        3rd quartile
      </ButtonCheckbox>
      <ButtonCheckbox
        id="quartile-4"
        mode={percentile}
        setMode={setPercentile}
        name="percentile"
      >
        Maximum
      </ButtonCheckbox>
    </div>
  );
}

function Criteria({ mode, setMode, percentile, setPercentile }) {
  return (
    <>
      <Mode mode={mode} setMode={setMode} />
      <hr />
      <p>
        Ordered from {modes[mode].worstLabel} to {modes[mode].bestLabel}
      </p>
      <Percentile percentile={percentile} setPercentile={setPercentile} />
    </>
  );
}

export default Criteria;
