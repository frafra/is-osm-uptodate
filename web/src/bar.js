import React, { useState } from 'react';

import Settings from './components/settings';
import Actions from './components/actions';
import Criteria from './components/criteria';
import Statistics from './components/statistics';
import Download from './components/download';

import './bar.css';

const classNames = require('classnames');

function AccordionItem({ title, children }) {
  const [collapse, setCollapse] = useState(false);
  return (
    <div className="accordion-item">
      <h2 className="accordion-header" id="section-settings-heading">
        <button
          className={classNames('accordion-button', { collapsed: collapse })}
          type="button"
          onClick={() => setCollapse(!collapse)}
        >
          {title}
        </button>
      </h2>
      <div
        className={classNames('accordion-collapse', 'collapse', {
          show: !collapse,
        })}
      >
        <div className="accordion-body">{children}</div>
      </div>
    </div>
  );
}

function Bar({
  state,
  setState,
  setFilter,
  mode,
  setMode,
  percentile,
  setPercentile,
  statistics,
  downloadLink,
}) {
  return (
    <div id="bar" className="bg-light accordion">
      <AccordionItem title="Settings">
        <Settings setFilter={setFilter} />
      </AccordionItem>
      <AccordionItem title="Actions">
        <Actions state={state} setState={setState} />
      </AccordionItem>
      <AccordionItem title="Criteria">
        <Criteria
          mode={mode}
          setMode={setMode}
          percentile={percentile}
          setPercentile={setPercentile}
        />
      </AccordionItem>
      <AccordionItem title="Statistics">
        <Statistics statistics={statistics} />
      </AccordionItem>
      <AccordionItem title="Save">
        <Download downloadLink={downloadLink} />
      </AccordionItem>
    </div>
  );
}

export default Bar;
