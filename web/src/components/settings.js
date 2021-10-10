import React from 'react';

function Settings({ setFilter }) {
  return (
    <div className="input-group">
      <div className="input-group-prepend">
        <div className="input-group-text">Filter</div>
      </div>
      <input
        className="form-control"
        type="text"
        placeholder="example: amenity=*"
        onChange={(event) => setFilter(event.target.value)}
      />
    </div>
  );
}

export default Settings;
