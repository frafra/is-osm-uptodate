let map = L.map('map');

let custom_attribution = `${document.title} (<a href="https://github.com/frafra/is-osm-uptodate">source code</a>)`;
let OpenStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: `${custom_attribution} | &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>`,
  maxZoom: 19,
  minZoom: 1
});

OpenStreetMapLayer.addTo(map);
map.setView([45.46423, 9.19073], 18); // Duomo di Milano

L.easyButton('fa-refresh', (btn, map) => {
    getNodes();
}).addTo(map);

let info = L.control();
info.onAdd = map => {
  this.div = L.DomUtil.create('div', 'info');
  return this.div;
};
info.update = message => {
  this.div.innerHTML = message;
  this.div.innerHTML += `
    <div class="bar">
      <span>Old</span>
      <span class="colors"></span>
      <span>New</span>
    </div>`;
};
info.addTo(map);

let nodes = L.geoJSON();

function openOldestMarker() {
  map.panTo(window.oldestMarker.getLatLng());
  window.oldestMarker.openPopup();
}

function getNodes() {
  info.update('Loading nodes...');
  let bounds = map.getBounds();
  let west = bounds.getWest();
  let east = bounds.getEast();
  let south = bounds.getSouth();
  let north = bounds.getNorth();
  let url = `/api/getNodes?minx=${west}&maxx=${east}&miny=${south}&maxy=${north}`;
  fetch(url).then(response => {
    return response.json();
  }).then(results => {
    nodes.remove();
    let oldest = new Date();
    let oldestNode;
    for (let index in results.features) {
      let feature = results.features[index];
      let date = new Date(feature.properties.timestamp);
      if (date < oldest) {
        oldest = date;
        oldestNode = feature;
      }
    }
    let timestamp = oldest.toISOString().slice(0, 10);
    info.update(`Oldest node:
      <a href="javascript:openOldestMarker();">#${oldestNode.properties.node_id}</a>
      (${timestamp})`);
    let range = (new Date()).getTime()-oldest.getTime();
    nodes = L.geoJSON(results, {
        pointToLayer: (feature, latlng) => {
            let attributes_list = `<ul>`;
            for (let key in feature.properties.attributes) {
              let value = feature.properties.attributes[key];
              attributes_list += `<li><a href="https://wiki.openstreetmap.org/wiki/Key:${key}" target="_blank">${key}</a>:
               <a href="https://wiki.openstreetmap.org/wiki/Tag:${key}%3D${value}" target="_blank">${value}</a></li>`;
            }
            attributes_list += `</ul>`;
            let popup = `
              <h3 style="text-align: center">Node #${feature.properties.node_id}</h3>
              <b>Last edit</b>: ${feature.properties.timestamp}<br>
              <b>User</b>:
                <a href="https://www.openstreetmap.org/user/${feature.properties.user}" target="_blank">${feature.properties.user}</a>
                (${feature.properties.uid})<br>
              <b>Version</b>: ${feature.properties.version}<br>
              <b>Attributes:</b>
                ${attributes_list}
              <br>
              <div style="text-align: center">
                <a href="https://www.openstreetmap.org/edit?node=${feature.properties.node_id}" target="_blank">Edit <a> |
                <a href="https://www.openstreetmap.org/node/${feature.properties.node_id}/history" target="_blank">History</a> |
                <a href="https://www.openstreetmap.org/node/${feature.properties.node_id}" target="_blank">Details<a>
              </div>
            `
            let now = new Date(feature.properties.timestamp);
            let seconds = now.getTime()-oldest.getTime();
            let computed = 240*seconds/range;
            let marker = L.circleMarker(latlng, {
              radius: 5,
              fillColor: `hsl(${computed}, 100%, 50%)`,
              color: "#555",
              weight: 1,
              opacity: 1,
              fillOpacity: 1
            });
            marker.bindPopup(popup);
            if (feature.properties.node_id == oldestNode.properties.node_id) {
              window.oldestMarker = marker;
            }
            return marker;
        }
    });
    nodes.addTo(map);
  });
}

getNodes();
