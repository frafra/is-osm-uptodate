import React, { useEffect, useState } from 'react';

import { states } from '../constants';

function Statistics({ state, mode, url }) {
  const [statistics, setStatistics] = useState({});
  useEffect(() => {
    if (!url) return;
    url = url.replace('/getData?', '/getStats?');
    url += `&param=` + mode;
    fetch(url)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return response.text().then((text) => {
        throw new Error(text);
      });
    })
    .then((parsed) => {
      setStatistics(parsed);
    })
    .catch((error) => {
      console.log(error);
    });
  }, [url, mode]);

  return (
    <table className="table table-striped">
      <tbody>
        {Object.keys(statistics).map((key) => (
          <tr key={key}>
            <th scope="row">{key}</th>
            <td>
              {statistics[key]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Statistics;
