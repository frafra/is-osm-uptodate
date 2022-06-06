import React, { useState } from 'react';

function Settings({ setFilter, setCustomBoundaries }) {
  const [text, setText] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setFilter(text);
  }

  function removeText() {
    const filterForm = document.getElementById('filterForm');
    filterForm.reset();
    setText('');
  }

  function uploadFile(e) {
    setFileUploaded(true);
    e.target.files[0]
      .text()
      .then((geojson) => {
        setCustomBoundaries(JSON.parse(geojson));
      })
      .catch((error) => {
        // eslint-disable-next-line no-alert
        alert(`Please select a valid GeoJSON file. Error: ${error}`);
      });
  }

  function removeFile() {
    const boundariesForm = document.getElementById('boundariesForm');
    boundariesForm.reset();
    setCustomBoundaries();
    setFileUploaded(false);
  }

  return (
    <>
      <form id="filterForm" className="form-inline" onSubmit={handleSubmit}>
        <label htmlFor="filter">
          Filter nodes using{' '}
          <a
            href="https://docs.ohsome.org/ohsome-api/v1/filter.html#selectors"
            target="_blank"
            rel="noreferrer"
          >
            Ohsome selectors
          </a>
        </label>
        <div className="input-group">
          <input
            id="filter"
            className="form-control"
            type="text"
            placeholder="example: amenity=*"
            onChange={(event) => setText(event.target.value.trim())}
          />
          <input className="btn btn-primary" type="submit" value="Set" />
          {text && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={removeText}
            >
              <i className="fa fa-trash" />
            </button>
          )}
        </div>
      </form>
      <br />
      <form
        id="boundariesForm"
        className="form-inline"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="boundaries">Set custom GeoJSON boundaries</label>
        <div className="input-group">
          <input
            id="boundaries"
            className="form-control"
            type="file"
            name="boundaries"
            onChange={uploadFile}
          />
          {fileUploaded && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={removeFile}
            >
              <i className="fa fa-trash" />
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export default Settings;
