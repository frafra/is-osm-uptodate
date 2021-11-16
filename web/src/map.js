import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  AttributionControl,
  MapContainer,
  TileLayer,
  CircleMarker,
  GeoJSON,
  Popup,
  Rectangle,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';

import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

import { interpolateViridis } from 'd3-scale-chromatic';

import {
  customAttribution,
  tileURL,
  maxZoom,
  defaultLocation,
} from './constants';

import './map.css';

import 'bootstrap/dist/css/bootstrap.css';

import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';

const modes = {
  lastedit: {
    defaultValue: new Date().getTime(),
    getValue: (feature) => new Date(feature.properties.lastedit).getTime(),
    prettyValue: (date) => new Date(date).toISOString().slice(0, 10),
    inverted: false,
    worstLabel: 'least recently updated',
    bestLabel: 'most recently updated',
  },
  creation: {
    defaultValue: new Date().getTime(),
    getValue: (feature) => new Date(feature.properties.created).getTime(),
    prettyValue: (date) => new Date(date).toISOString().slice(0, 10),
    inverted: false,
    worstLabel: 'oldest',
    bestLabel: 'newest',
  },
  revisions: {
    defaultValue: 1,
    getValue: (feature) => feature.properties.version,
    prettyValue: (value) => value,
    inverted: false,
    worstLabel: 'fewest revisions',
    bestLabel: 'most revisions',
  },
  frequency: {
    defaultValue: 0,
    getValue: (feature) => feature.properties.average_update_days,
    prettyValue: (value) => {
      const days = Math.floor(value);
      if (days < 1) return 'daily';
      if (days < 365) return `every ${days} days`;
      const years = Math.floor(value / 365);
      return `every ${years} year(s)`;
    },
    inverted: true,
    worstLabel: 'least frequently updated',
    bestLabel: 'most frequently updated',
  },
};

let colour = 0;
const style = document.createElement('style');
document.head.appendChild(style);
function applyColor() {
  while (style.sheet.cssRules.length) {
    style.sheet.deleteRule(0);
  }
  style.sheet.insertRule(
    `.leaflet-tile-container { filter: grayscale(${100 - colour}%); }`,
    0
  );
}

function setColor(event) {
  colour = event.target.value;
  applyColor();
}

function iconCreateFunction(percentile, colormap, cluster) {
  const markers = cluster.getAllChildMarkers();
  const values = markers.map((marker) => colormap[marker.options.fillColor]);
  values.sort((a, b) => a - b);
  const aggregated = values[Math.ceil((percentile * values.length) / 100) - 1];
  const html = document.createElement('div');
  html.style.backgroundColor = interpolateViridis(aggregated);
  const content = document.createElement('span');
  content.innerText = markers.length;
  html.appendChild(content);
  return L.divIcon({ html, className: 'mycluster' });
}

function updateBounds(map, setBounds) {
  const center = map.getCenter();
  const lat = center.lat.toFixed(5);
  const lng = center.lng.toFixed(5);
  const zoom = map.getZoom();
  document.location.hash = `${zoom}/${lat}/${lng}`;

  setBounds(map.getBounds());
}

function GetBounds({ setBounds }) {
  const map = useMapEvents({
    resize: () => updateBounds(map, setBounds),
    moveend: () => updateBounds(map, setBounds),
    zoomend: () => updateBounds(map, setBounds),
  });
  return null;
}

function generatePopup(feature, event) {
  const type = feature.geometry.type === 'Point' ? 'node' : 'way';
  const base = 'https://www.openstreetmap.org';
  return ReactDOMServer.renderToString(
    <>
      <b>Last edit</b>: {feature.properties.lastedit}
      <br />
      <b>Created at</b>: {feature.properties.created}
      <br />
      <b>Current version</b>: {feature.properties.version}
      <br />
      <div className="text-center">
        <a href="{base}/edit?{type}={feature.properties.id}" target="_blank">
          Edit
        </a>
        {' | '}
        <a href="{base}/{type}/{feature.properties.id}/history" target="_blank">
          History
        </a>
        {' | '}
        <a href="{base}/{type}/{feature.properties.id}" target="_blank">
          Details
        </a>
      </div>
    </>
  );
}

function pointToLayer(geoJsonPoint, latlng) {
  // https://github.com/PaulLeCam/react-leaflet/issues/234
  const circle = L.circleMarker(latlng, {
    radius: 5,
    fillColor: geoJsonPoint.properties.color,
    color: '#555',
    weight: 1,
    opacity: 1,
    fillOpacity: 1,
  });
  circle.osmid = geoJsonPoint.properties.id;
  circle.bindPopup(generatePopup.bind(null, geoJsonPoint));
  return circle;
}

function setup(map) {
  const search = new GeoSearchControl({
    provider: new OpenStreetMapProvider(),
    showMarker: false,
  });
  map.addControl(search);
  applyColor();
}

function CustomControl({ worstPretty, bestPretty, setColor }) {
  const divRef = useRef(null);
  useEffect(() => {
    if (divRef.current) L.DomEvent.disableClickPropagation(divRef.current);
  });

  return (
    <div className="leaflet-top leaflet-right" ref={divRef}>
      <div className="leaflet-control leaflet-bar" id="info">
        <div className="bar">
          <span>{worstPretty}</span>
          <span className="colors" />
          <span>{bestPretty}</span>
        </div>
        <div className="slider">
          Background colour
          <input
            type="range"
            id="grayscale"
            defaultValue="0"
            onChange={setColor}
          />
        </div>
      </div>
    </div>
  );
}

function CustomGeoJSON({ geojson, mode, worstId, bestId, setStatistics }) {
  const geojsonRef = useRef(null);
  const map = useMap();
  useEffect(() => {
    if (geojsonRef.current && worstId && bestId) {
      const stats = {
        worstNode: {
          label: modes[mode].worstLabel,
          osmid: worstId,
        },
        bestNode: {
          label: modes[mode].bestLabel,
          osmid: bestId,
        },
      };
      Object.keys(stats).forEach((key) => {
        stats[key].marker = Object.values(geojsonRef.current._layers).find(
          (layer) => layer.osmid === stats[key].osmid
        );
        stats[key].marker.map = map;
      });
      setStatistics(stats);
    } else {
      setStatistics({});
    }
  }, [geojson, mode, geojsonRef.current]);

  // https://github.com/PaulLeCam/react-leaflet/issues/332
  const geojsonKey = useMemo(() => {
    return Math.random();
  }, [geojson, mode]);

  return (
    <GeoJSON
      key={geojsonKey}
      ref={geojsonRef}
      data={geojson}
      pointToLayer={pointToLayer}
    />
  );
}

function Map(props) {
  const clusterRef = useRef(null);
  let [zoom, lon, lat] = document.location.hash.substr(1).split('/');
  if (!(zoom && lon && lat)) [zoom, lon, lat] = defaultLocation;
  const [colormap, worstId, worstPretty, bestId, bestPretty] = useMemo(() => {
    const colormap = {};
    const { getValue } = modes[props.mode];
    let worst = modes[props.mode].defaultValue;
    let worstId = null;
    let best = modes[props.mode].defaultValue;
    let bestId = null;
    let values = [];
    if (props.geojson) {
      const { getValue } = modes[props.mode];
      values = props.geojson.features.map((feature) => getValue(feature));
    }
    if (values.length > 0) {
      const lowest = Math.min(...values);
      const highest = Math.max(...values);
      const { inverted } = modes[props.mode];
      worst = !inverted ? lowest : highest;
      best = !inverted ? highest : lowest;
      const range = highest - lowest;
      props.geojson.features.forEach((feature) => {
        const score = Math.abs(worst - getValue(feature)) / range;
        const color = interpolateViridis(score);
        feature.properties.color = color;
        colormap[color] = score;
      });
      worstId = props.geojson.features[values.indexOf(worst)].properties.id;
      bestId = props.geojson.features[values.indexOf(best)].properties.id;
    }
    const worstPretty = modes[props.mode].prettyValue(worst);
    const bestPretty = modes[props.mode].prettyValue(best);
    return [colormap, worstId, worstPretty, bestId, bestPretty];
  }, [props.geojson, props.mode]);

  // https://github.com/yuzhva/react-leaflet-markercluster/pull/162
  const iconCreateFn = useMemo(() => {
    return iconCreateFunction.bind(null, props.percentile, colormap);
  }, [props.percentile, colormap]);

  useEffect(() => {
    if (clusterRef.current) clusterRef.current.refreshClusters();
  }, [props.percentile, props.mode, props.geojson]);

  return (
    <MapContainer
      id="map"
      center={[lon, lat]}
      zoom={zoom}
      whenCreated={(map) => {
        setup(map);
        // https://github.com/PaulLeCam/react-leaflet/issues/46
        map.onload = updateBounds(map, props.setBounds);
      }}
      attributionControl={false}
    >
      <TileLayer
        attribution={customAttribution}
        url={tileURL}
        maxZoom={maxZoom}
        prefix={false}
      />
      <GetBounds setBounds={props.setBounds} />
      {props.boundsLoaded && (
        <Rectangle
          pathOptions={{ color: '#ff7800', fill: false, weight: 3 }}
          bounds={props.boundsLoaded}
        />
      )}
      <MarkerClusterGroup
        ref={clusterRef}
        iconCreateFunction={iconCreateFn}
        spiderfyOnMaxZoom={false}
        disableClusteringAtZoom={19}
      >
        {props.geojson && (
          <CustomGeoJSON
            geojson={props.geojson}
            mode={props.mode}
            worstId={worstId}
            bestId={bestId}
            setStatistics={props.setStatistics}
          />
        )}
      </MarkerClusterGroup>
      <CustomControl
        worstPretty={worstPretty}
        bestPretty={bestPretty}
        setColor={setColor}
      />
      <AttributionControl position="bottomright" prefix="" />
    </MapContainer>
  );
}

export default Map;
