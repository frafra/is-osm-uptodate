import React, { useEffect, useState } from 'react';

function Statistics({ mode, url }) {
  const [statistics, setStatistics] = useState({});
  useEffect(() => {
    if (!url) return;
    const newUrl = `${url.replace('/getData?', '/getStats?')}&param=${mode}`;
    fetch(newUrl)
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
        throw new Error(error);
      });
  }, [url, mode]);

  return (
    <table className="table table-striped">
      <tbody>
        {Object.keys(statistics).map((key) => (
          <tr key={key}>
            <th scope="row">{key}</th>
            <td>{statistics[key]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Statistics;
