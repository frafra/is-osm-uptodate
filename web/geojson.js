let map = L.map('map');
const search = new GeoSearch.GeoSearchControl({
  provider: new GeoSearch.OpenStreetMapProvider(),
  showMarker: false,
});
map.addControl(search);

let hash = new L.Hash(map);

let custom_attribution = `<a href="https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date">${document.title}</a> (<a href="https://github.com/frafra/is-osm-uptodate">source code</a>)`;
let OpenStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: `${custom_attribution} | &copy; <a href="https://ohsome.org/copyrights">OpenStreetMap contributors</a>`,
  maxZoom: 19,
  minZoom: 1
});

OpenStreetMapLayer.addTo(map);

let colour = 0;
let style = document.createElement('style');
document.head.appendChild(style);
map.whenReady(applyColor);
function applyColor() {
  while (style.sheet.cssRules.length) {
    style.sheet.deleteRule(0);
  }
  style.sheet.insertRule(`.leaflet-tile-container { filter: grayscale(${100-colour}%); }`, 0);
}

function setColor(event) {
  colour = event.target.value;
  applyColor();
}

document.getElementById('fetch').onclick = getData;

let mode = 'lastedit';
let buttonModes = document.querySelectorAll('#mode input');
for (let i=0; i<buttonModes.length; i++) {
  buttonModes[i].onchange = event => {
    mode = event.target.id;
    parseData();
  }
};
let modes = {
    lastedit: {
        defaultValue: new Date(),
        getValue: feature => new Date(feature.properties.lastedit),
        prettyValue: date => date.toISOString().slice(0, 10),
        inverted: false
    },
    creation: {
        defaultValue: new Date(),
        getValue: feature => new Date(feature.properties.created),
        prettyValue: date => date.toISOString().slice(0, 10),
        inverted: false
    },
    revisions: {
        defaultValue: 1,
        getValue: feature => feature.properties.version,
        prettyValue: value => value,
        inverted: false
    },
    frequency: {
        defaultValue: 0,
        getValue: feature => feature.properties.average_update_days,
        prettyValue: value => {
          let days = Math.floor(value);
          if (days < 1) return 'daily';
          if (days < 365) return `every ${days} days`;
          let years = Math.floor(value/365);
          return `every ${years} year(s)`;
        },
        inverted: true
    }
};

let minimumValue = modes[mode].defaultValue;
let maximumValue = modes[mode].defaultValue;
document.getElementById("percentile").value = 50;
let info = L.control();
info.onAdd = map => {
  this.div = L.DomUtil.create('div', 'info');
  L.DomEvent.disableClickPropagation(this.div);
  return this.div;
};
info.update = message => {
  if (!modes[mode].inverted) {
    minimumValuePretty = modes[mode].prettyValue(minimumValue);
    maximumValuePretty = modes[mode].prettyValue(maximumValue);
  } else {
    minimumValuePretty = modes[mode].prettyValue(maximumValue);
    maximumValuePretty = modes[mode].prettyValue(minimumValue);
  }
  this.div.innerHTML = `
    <div class="bar">
      <span>${minimumValuePretty}</span>
      <span class="colors"></span>
      <span>${maximumValuePretty}</span>
    </div>
    <div class="slider">
      Background colour
      <input type="range" id="grayscale" value="${colour}"/>
    </div>
  `;
  document.getElementById('percentile').oninput = event => {
    percentile = parseInt(event.target.value);
    nodes.refreshClusters();
  }
  document.getElementById('grayscale').addEventListener('input', setColor);
};
info.addTo(map);

let nodes = L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
        var markers = cluster.getAllChildMarkers();
        let values = markers.map(marker => colormap[marker.options.fillColor]);
        values.sort(function(a, b) {
          return a - b;
        });
        let percentile = document.getElementById('percentile').value;
        let aggregated = values[Math.ceil(percentile*values.length/100)-1];
        let html = document.createElement('div');
        html.style.backgroundColor = d3.interpolateViridis(aggregated);
        let content = document.createElement('span');
        content.innerText = markers.length;
        html.appendChild(content);
        return L.divIcon({ html: html, className: "mycluster" });
    },
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 19,
});
let rectangle = L.layerGroup();

nodes.addTo(map);

let autoopen = false;
function openNodeMarker() {
  nodes.addTo(map);
  autoopen=true;
  map.on('zoomend', function() {
   if (autoopen) {
     window.nodeMarker.openPopup();
     autoopen=false;
     }
  });
  map.flyTo(window.nodeMarker._latlng, OpenStreetMapLayer.options.maxZoom);
}

function generatePopup(feature) {
  let position = location.hash.substr(1);
  let type = feature.geometry.type == 'Point' ? 'node' : 'way';
  let popup = `
    <b>Last edit</b>: ${feature.properties.lastedit}<br>
    <b>Created at</b>: ${feature.properties.created}<br>
    <b>Current version</b>: ${feature.properties.version}<br>
    <div style="text-align: center">
      <a href="https://www.openstreetmap.org/edit?${type}=${feature.properties.id}#map=${position}" target="_blank">Edit <a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}/history" target="_blank">History</a> |
      <a href="https://www.openstreetmap.org/${type}/${feature.properties.id}" target="_blank">Details<a>
    </div>
  `;
  return popup;
}

let bounds;
function computeUrl() {
  info.update();
  bounds = map.getBounds();
  let west = bounds.getWest();
  let south = bounds.getSouth();
  let east = bounds.getEast();
  let north = bounds.getNorth();
  let url = `/api/getData?minx=${west}&miny=${south}&maxx=${east}&maxy=${north}`;
  let filter = document.getElementById('filter').value;
  if (filter.trim().length > 0) url += `&filter=${filter}`;
  return url;
}
function getData() {
  let spinner = document.getElementById('spinner');
  spinner.classList.remove("d-none");
  download.href = '#';
  download.classList.add("disabled");
  let url = computeUrl();
  fetch(url).then(response => {
    info.update();
    let spinner = document.getElementById('spinner');
    spinner.classList.add("d-none");
    let download = document.getElementById('download');
    let valid_json = response.json();
    download.href = url;
    download.classList.remove("disabled");
    return valid_json;
  }).then(parseData).catch(error => {
    let spinner = document.getElementById('spinner');
    spinner.classList.add("d-none");
    console.log(error);
  });
};

let results;
let colormap = {};
function parseData(data) {
  results = data ? data : results;
  nodes.clearLayers();
  rectangle.remove();
  minimumValue = modes[mode].defaultValue;
  maximumValue = modes[mode].defaultValue;
  let minimumNodeValue = modes[mode].defaultValue;
  let maximumNodeValue = modes[mode].defaultValue;
  let minimumNode;
  let maximumNode;
  let defaultValue = modes[mode].defaultValue;
  for (let index in results.features) {
    let feature = results.features[index];
    let value = modes[mode].getValue(feature);
    if (feature.geometry.type == 'Point') {
      if (value <= minimumNodeValue || minimumNodeValue == defaultValue) {
        minimumNodeValue = value;
        minimumNode = feature;
      }
      if (value > maximumNodeValue || maximumNodeValue == defaultValue) {
        maximumNodeValue = value;
        maximumNode = feature;
      }
    }
    if (value <= minimumValue) {
      minimumValue = value;
    }
    if (value > maximumValue) {
      maximumValue = value;
    }
  }
  let nodePrettyId;
  if (!modes[mode].inverted) {
    nodePrettyId = minimumNode.properties.id;
  } else {
    nodePrettyId = maximumNode.properties.id;
  }
  document.getElementById("worstnode").innerText = nodePrettyId;
  let range;
  if (modes[mode].inverted) range = minimumValue-maximumValue;
  else range = maximumValue-minimumValue;
  let markers = [];
  colormap = {}; // reset
  L.geoJSON(results, {
    pointToLayer: (feature, latlng) => {
      let value = modes[mode].getValue(feature);
      let computed;
      if (modes[mode].inverted) computed = (value-maximumValue)/range;
      else computed = (value-minimumValue)/range;
      let color = d3.interpolateViridis(computed);
      colormap[color] = computed;
      let marker = L.circleMarker(latlng, {
        radius: 5,
        fillColor: color,
        color: "#555",
        weight: 1,
        opacity: 1,
        fillOpacity: 1
      });
      let popup = generatePopup(feature);
      marker.bindPopup(popup);
      if (!modes[mode].inverted) {
        if (feature.properties.id == minimumNode.properties.id) {
          window.nodeMarker = marker;
        }
      } else {
        if (feature.properties.id == maximumNode.properties.id) {
          window.nodeMarker = marker;
        }
      }
      markers.push(marker);
      return marker;
    }
  });
  rectangle = L.rectangle(bounds, {
    color: "#ff7800", fill: false, weight: 3
  });
  rectangle.addTo(map);
  nodes.addLayers(markers);
  info.update();
}

if (!document.location.hash) {
  map.setView([45.46423, 9.19073], 19); // Duomo di Milano
  getData();
}

map.on('load', getData);
