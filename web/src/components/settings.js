import React, { useState } from 'react';

function Settings({ setFilter }) {
  const [text, setText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setFilter(text);
    setText("");
  }

  return (
    <form className="input-group" onSubmit={handleSubmit}>
      <input
        className="form-control"
        type="text"
        placeholder="example: amenity=*"
        onChange={(event) => setText(event.target.value)}
      />
      <input className="btn btn-primary" type="submit" value="Set" />
    </form>
  );
}

export default Settings;
