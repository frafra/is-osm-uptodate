import React, { useState } from 'react';

const classNames = require('classnames');

function Settings({ setFilter, setCustomBoundaries }) {
  const [text, setText] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setFilter(text);
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
      <form className="input-group" onSubmit={handleSubmit}>
        <input
          className="form-control"
          type="text"
          placeholder="example: amenity=*"
          onChange={(event) => setText(event.target.value.trim())}
        />
        <input className="btn btn-primary" type="submit" value="Set" />
      </form>
      <br />
      <form
        id="boundariesForm"
        className="input-group"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="boundaries">Upload custom boundaries (GeoJSON)</label>
        <input
          className="form-control"
          type="file"
          id="boundaries"
          name="boundaries"
          onChange={uploadFile}
        />
        <button
          type="button"
          className={classNames('btn', 'btn-secondary', {
            disabled: !fileUploaded,
          })}
          onClick={removeFile}
        >
          <i className="fa fa-trash" />
        </button>
      </form>
    </>
  );
}

export default Settings;
