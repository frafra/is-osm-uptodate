import React from 'react';

function ButtonCheckbox({ id, children, mode, setMode }) {
  const checked = id === mode;
  return (
    <>
      <input
        type="radio"
        className="btn-check"
        name="modes"
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
      <ButtonCheckbox id="creation" mode={mode} setMode={setMode}>
        <i className="fas fa-fast-backward" /> First edit
      </ButtonCheckbox>
      <ButtonCheckbox id="lastedit" mode={mode} setMode={setMode}>
        <i className="fas fa-fast-forward" /> Last edit
      </ButtonCheckbox>
      <ButtonCheckbox id="revisions" mode={mode} setMode={setMode}>
        <i className="fas fa-clone" /> Revisions
      </ButtonCheckbox>
      <ButtonCheckbox id="frequency" mode={mode} setMode={setMode}>
        <i className="fas fa-stopwatch" /> Update frequency
      </ButtonCheckbox>
    </div>
  );
}

function Percentile({ percentile, setPercentile }) {
  return (
    <>
      <div className="input-group pt-3">
        <span className="input-group-text">Show the</span>
        <input
          type="number"
          className="form-control"
          min="1"
          max="100"
          step="1"
          value={percentile}
          onChange={(e) => {
            setPercentile(e.target.value);
          }}
        />
        <span className="input-group-text">percentile</span>
      </div>
      <p className="form-text">
        When grouping nodes, leave out the lowest {percentile}&nbsp;% and show
        the node after.
      </p>
    </>
  );
}

function Criteria({ mode, setMode, percentile, setPercentile }) {
  return (
    <>
      <Mode mode={mode} setMode={setMode} />
      <Percentile percentile={percentile} setPercentile={setPercentile} />
    </>
  );
}

export default Criteria;
