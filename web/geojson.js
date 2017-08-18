let map = L.map('map');
let hash = new L.Hash(map);

let custom_attribution = `${document.title} (<a href="https://github.com/frafra/is-osm-uptodate">source code</a>)`;
let OpenStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: `${custom_attribution} | &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>`,
  maxZoom: 19,
  minZoom: 1
});

OpenStreetMapLayer.addTo(map);

L.easyButton('fa-refresh', (btn, map) => {
    getData();
}).addTo(map);

let colour = 100;
function setColor(event) {
  let tiles = document.getElementsByClassName('leaflet-tile-container')[0];
  colour = event.target.value;
  tiles.style.filter = `grayscale(${100-colour}%)`;
}

let info = L.control();
info.onAdd = map => {
  this.div = L.DomUtil.create('div', 'info');
  L.DomEvent.disableClickPropagation(this.div);
  return this.div;
};
info.update = message => {
  this.div.innerHTML = `
    <div style="text-align: center">${message}</div>
    <div class="bar">
      <span>Old</span>
      <span class="colors"></span>
      <span>New</span>
    </div>
    <hr/>
    <div class="slider">
      Colour
      <input type="range" id="grayscale" value="${colour}"/>
    </div>
  `;
  document.getElementById('grayscale').addEventListener('input', setColor);
};
info.addTo(map);

let nodes = L.layerGroup();
let ways = L.layerGroup();
let rectangle = L.layerGroup();

let overlays = {
  "Nodes":nodes,
  "Ways":ways,
}
L.control.layers({}, overlays, {collapsed:false}).addTo(map);
nodes.addTo(map);

function openOldestMarker() {
  nodes.addTo(map);
  map.panTo(window.oldestMarker.getLatLng());
  window.oldestMarker.openPopup();
}

function generatePopup(feature) {
  let attributes_list = `<ul>`;
  for (let key in feature.properties.attributes) {
    let value = feature.properties.attributes[key];
    attributes_list += `<li><a href="https://wiki.openstreetmap.org/wiki/Key:${key}" target="_blank">${key}</a>:
     <a href="https://wiki.openstreetmap.org/wiki/Tag:${key}%3D${value}" target="_blank">${value}</a></li>`;
  }
  attributes_list += `</ul>`;
  let position = location.hash.substr(1);
  let type = feature.geometry.type == 'Point' ? 'node' : 'way';
  let popup = `
    <h3>${type} #${feature.properties.id}</h3>
    <b>Last edit</b>: ${feature.properties.timestamp}<br>
    <b>User</b>:
      <a href="https://www.openstreetmap.org/user/${feature.properties.user}" target="_blank">${feature.properties.user}</a>
      (${feature.properties.uid})<br>
    <b>Version</b>: ${feature.properties.version}<br>
    <b>Attributes:</b>
      ${attributes_list}
    <br>
    <div style="text-align: center">
      <a href="https://www.openstreetmap.org/edit?${type}=${feature.properties.id}#map=${position}" target="_blank">Edit <a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}/history" target="_blank">History</a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}" target="_blank">Details<a>
    </div>
  `;
  return popup;
}

function getData() {
  info.update('Loading data...');
  let bounds = map.getBounds();
  let west = bounds.getWest();
  let east = bounds.getEast();
  let south = bounds.getSouth();
  let north = bounds.getNorth();
  let url = `/api/getData?minx=${west}&maxx=${east}&miny=${south}&maxy=${north}`;
  fetch(url).then(response => {
    return response.json();
  }).then(results => {
    nodes.clearLayers();
    ways.clearLayers();
    rectangle.remove();
    let oldest = new Date();
    let oldestNode;
    for (let index in results.features) {
      let feature = results.features[index];
      if (feature.geometry.type !== 'Point') continue;
      let date = new Date(feature.properties.timestamp);
      if (date < oldest) {
        oldest = date;
        oldestNode = feature;
      }
    }
    let timestamp = oldest.toISOString().slice(0, 10);
    info.update(`
      Oldest node:
      <a href="javascript:openOldestMarker();">#${oldestNode.properties.id}</a>
      (${timestamp})
    `);
    let range = (new Date()).getTime()-oldest.getTime();
    L.geoJSON(results, {
        pointToLayer: (feature, latlng) => {
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
            let popup = generatePopup(feature);
            marker.bindPopup(popup);
            if (feature.properties.id == oldestNode.properties.id) {
              window.oldestMarker = marker;
            }
            nodes.addLayer(marker);
            return marker;
        },
        onEachFeature: (feature, layer) => {
          if (feature.geometry.type !== 'LineString') return;
          let now = new Date(feature.properties.timestamp);
          let seconds = now.getTime()-oldest.getTime();
          let computed = 240*seconds/range;
          layer.options.color = `hsla(${computed}, 100%, 50%, 0.5)`;
          let popup = generatePopup(feature);
          layer.bindPopup(popup);
          ways.addLayer(layer);
        }
    });
    rectangle = L.rectangle(bounds, {
      color: "#ff7800", fill: false, weight: 3
    });
    rectangle.addTo(map);
  }).catch(error => {
    info.update('Error!');
    console.log(error);
  });
}

if (!document.location.hash) {
  map.setView([45.46423, 9.19073], 18); // Duomo di Milano
  getData();
}

map.on('load', getData);
