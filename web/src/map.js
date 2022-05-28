import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  AttributionControl,
  MapContainer,
  TileLayer,
  GeoJSON,
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
  dataTileURL,
  maxZoom,
  minZoom,
  defaultLocation,
  valuesBlacklist,
  modes,
  states,
} from './constants';

import './map.css';

import 'bootstrap/dist/css/bootstrap.css';

import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';

const computePercentile = require('percentile');

let colour = 0;
const style = document.createElement('style');
document.head.appendChild(style);
function applyColor() {
  while (style.sheet.cssRules.length) {
    style.sheet.deleteRule(0);
  }
  style.sheet.insertRule(
    `.leaflet-tile-pane > .leaflet-layer:first-of-type > .leaflet-tile-container { filter: grayscale(${
      100 - colour
    }%); }`,
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
  const aggregated = computePercentile(percentile, values);
  const html = document.createElement('div');
  html.style.backgroundColor = interpolateViridis(aggregated);
  const content = document.createElement('span');
  content.innerText = markers.length;
  html.appendChild(content);
  return L.divIcon({ html, className: 'mycluster' });
}

function loadData(setState, url, setGeojson) {
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
      setGeojson(parsed);
      setState(states.LOADED);
    })
    .catch((error) => {
      if (error.message === 'ohsome') {
        setState(states.ERROR_OHSOME);
      } else {
        setState(states.ERROR);
      }
    });
}

function updateBounds(map, setBounds) {
  const center = map.getCenter();
  const lat = center.lat.toFixed(5);
  const lng = center.lng.toFixed(5);
  const zoom = map.getZoom();
  document.location.hash = `${zoom}/${lat}/${lng}`;

  const bounds = map.getBounds();
  setBounds(bounds);
}

function GetBounds({ setBounds }) {
  const map = useMapEvents({
    resize: () => updateBounds(map, setBounds),
    moveend: () => updateBounds(map, setBounds),
    zoomend: () => updateBounds(map, setBounds),
  });
  return null;
}

const osm = 'https://www.openstreetmap.org';
const wiki = 'https://wiki.openstreetmap.org/wiki';
function generatePopup(feature, marker) {
  const type = feature.geometry.type === 'Point' ? 'node' : 'way';
  fetch(
    `/api/getFeature?feature_type=${type}&feature_id=${feature.properties.id}`
  )
    .then((response) => {
      return response.json();
    })
    .then((parsed) => {
      const node = parsed.elements[0];
      marker.setPopupContent(
        ReactDOMServer.renderToString(
          <>
            <b>Last edit</b>: {feature.properties.lastedit}
            <br />
            <b>Created at</b>: {feature.properties.created}
            <br />
            <b>Current version</b>: {feature.properties.version}
            <br />
            {node.tags && (
              <>
                <b>Attributes</b>:
                <ul>
                  {Object.keys(node.tags).map((key) => (
                    <li key={key}>
                      <a
                        href={`${wiki}/Key:${key}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {key}
                      </a>
                      {': '}
                      {key.match(valuesBlacklist) ? (
                        node.tags[key]
                      ) : (
                        <a
                          href={`${wiki}/Tag:${key}%3D${node.tags[key]}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {node.tags[key]}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="text-center">
              <a
                href={`${osm}/edit?${type}=${feature.properties.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Edit
              </a>
              {' | '}
              <a
                href={`${osm}/${type}/${feature.properties.id}/history`}
                target="_blank"
                rel="noreferrer"
              >
                History
              </a>
              {' | '}
              <a
                href={`${osm}/${type}/${feature.properties.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Details
              </a>
            </div>
          </>
        )
      );
    })
    .catch(() => {
      marker.setPopupContent(
        ReactDOMServer.renderToString(
          <>
            <p>Something went wrong with OSM API!</p>
            <p>
              Please try again later or{' '}
              <a href="https://github.com/frafra/is-osm-uptodate/issues/new/choose">
                open a ticket
              </a>
              !
            </p>
          </>
        )
      );
    });
  return ReactDOMServer.renderToString(<div className="spinner-border" />);
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

function CustomControl({ worstPretty, bestPretty }) {
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

function CustomGeoJSON({ geojson, mode }) {
  // https://github.com/PaulLeCam/react-leaflet/issues/332
  const geojsonKey = useMemo(() => {
    return Math.random();
  }, [geojson, mode]);

  return (
    <GeoJSON key={geojsonKey} data={geojson} pointToLayer={pointToLayer} />
  );
}

function Map({ mode, percentile, filter, state, setState, setUrl }) {
  const clusterRef = useRef(null);
  const [bounds, setBounds] = useState();
  const [geojson, setGeojson] = useState(null);
  let [zoom, lon, lat] = document.location.hash.substr(1).split('/');
  if (!(zoom && lon && lat)) [zoom, lon, lat] = defaultLocation;
  const [colormap, worst, best] = useMemo(() => {
    const newColormap = {};
    const { getValue } = modes[mode];
    let newWorst = modes[mode].defaultWorstValue;
    let newBest = modes[mode].defaultBestValue;
    let values = [];
    if (geojson) {
      values = geojson.features.map((feature) => getValue(feature));
    }
    if (values.length > 0) {
      const lowest = Math.min(...values);
      const highest = Math.max(...values);
      const { inverted } = modes[mode];
      newWorst = !inverted ? lowest : highest;
      newBest = !inverted ? highest : lowest;
      const range = highest - lowest;
      geojson.features.forEach((feature) => {
        const score = Math.abs(newWorst - getValue(feature)) / range;
        const color = interpolateViridis(score);
        feature.properties.color = color;
        newColormap[color] = score;
      });
    }
    return [newColormap, newWorst, newBest];
  }, [geojson, mode]);

  const worstPretty = modes[mode].prettyValue(worst);
  const bestPretty = modes[mode].prettyValue(best);

  // https://github.com/yuzhva/react-leaflet-markercluster/pull/162
  const iconCreateFn = useMemo(() => {
    return iconCreateFunction.bind(null, percentile, colormap);
  }, [percentile, colormap]);

  useEffect(() => {
    if (clusterRef.current) clusterRef.current.refreshClusters();
  }, [percentile, mode, geojson]);

  const params = new URLSearchParams({
    mode,
    percentile,
    filter,
    scale_min: modes[mode] ? worst : best,
    scale_max: modes[mode] ? best : worst,
  }).toString();

  const dataTileURLWithParams = `${dataTileURL}?${params}`;

  const loadAllData = zoom >= 17;

  let url = null;
  useEffect(() => {
    if (bounds) {
      url = `/api/getData?minx=${bounds.getWest()}&miny=${bounds.getSouth()}&maxx=${bounds.getEast()}&maxy=${bounds.getNorth()}`;
      if (filter.trim().length > 0) url += `&filter=${filter}`;
      setUrl(url);
      if (loadAllData) {
        setState(states.LOADING);
        loadData(setState, url, setGeojson);
      }
    }
  }, [url, bounds, filter]);

  const tileRef = useCallback((tileLayer) => {
    if (tileLayer !== null) {
      tileLayer.on('load', () => {
        setState(states.LOADED);
      });
      tileLayer.on('loading', () => {
        setState(states.LOADING);
      });
    }
  }, []);

  return (
    <MapContainer
      id="map"
      center={[lon, lat]}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      whenCreated={setup}
      whenReady={(event) => {
        const map = event.target;
        // https://github.com/PaulLeCam/react-leaflet/issues/46
        updateBounds(map, setBounds);
      }}
      attributionControl={false}
    >
      <TileLayer
        attribution={customAttribution}
        url={tileURL}
        maxZoom={maxZoom}
        prefix={false}
      />
      <GetBounds setBounds={setBounds} />

      {loadAllData ? (
        <MarkerClusterGroup
          ref={clusterRef}
          iconCreateFunction={iconCreateFn}
          spiderfyOnMaxZoom={false}
          disableClusteringAtZoom={19}
        >
          {geojson && <CustomGeoJSON geojson={geojson} mode={mode} />}
        </MarkerClusterGroup>
      ) : (
        <TileLayer
          ref={tileRef}
          key={dataTileURLWithParams}
          url={dataTileURLWithParams}
          tileSize={512}
          zoomOffset={-1}
          opacity={0.5}
          zIndex={1}
          updateWhenIdle
          updateWhenZooming={false}
          className="pixelated"
        />
      )}
      <CustomControl worstPretty={worstPretty} bestPretty={bestPretty} />
      <AttributionControl position="bottomright" prefix="" />
      {state === states.LOADING && (
        <div id="overlay">
          <div
            id="spinner"
            className="spinner-border text-primary"
            role="status"
          >
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )}
    </MapContainer>
  );
}

export default Map;
