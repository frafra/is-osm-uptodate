import React from 'react';

import { modes } from '../constants';

function Statistics({ mode, statistics }) {
  return (
    <table className="table table-striped">
      <tbody>
        {mode &&
          statistics[mode] &&
          Object.keys(statistics[mode]).map((key) => (
            <tr key={key}>
              <th scope="row">{key}</th>
              <td>{modes[mode].prettyValue(statistics[mode][key])}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default Statistics;
