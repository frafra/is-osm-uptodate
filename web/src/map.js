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
  maxZoom,
  minZoom,
  zoomLevelSwitch,
  defaultLocation,
  valuesBlacklist,
  modes,
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
            <b>First edit</b>:{' '}
            {modes.creation.prettyValue(feature.properties.creation)}
            <br />
            <b>Last edit</b>:{' '}
            {modes.lastedit.prettyValue(feature.properties.lastedit)}
            <br />
            <b>Revisions</b>:{' '}
            {modes.revisions.prettyValue(feature.properties.revisions)}
            <br />
            <b>Update frequency</b>:{' '}
            {modes.frequency.prettyValue(feature.properties.frequency)}
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
  circle.bindPopup(generatePopup.bind(null, geoJsonPoint), { autoPan: false });
  return circle;
}

function setup(map) {
  const search = new GeoSearchControl({
    provider: new OpenStreetMapProvider(),
    showMarker: false,
    // https://github.com/smeijer/leaflet-geosearch/issues/323
    marker: {},
    maxMarker: 0,
    position: 'topleft',
    autoClose: true,
    autoComplete: true,
    retainZoomLevel: false,
    maxSuggestions: 5,
    keepResult: true,
    resultFormat(t) {
      return `${t.result.label}`;
    },
    updateMap: !0,
  });
  map.addControl(search);
  applyColor();
}

function CustomControl({ mode, range }) {
  const divRef = useRef(null);
  useEffect(() => {
    if (divRef.current) L.DomEvent.disableClickPropagation(divRef.current);
  });

  return (
    <div className="leaflet-top leaflet-right" ref={divRef}>
      <div className="leaflet-control leaflet-bar" id="info">
        {mode && range && (
          <div className="bar">
            <span>{modes[mode].prettyValue(range[0])}</span>
            <span className="colors" />
            <span>{modes[mode].prettyValue(range[1])}</span>
          </div>
        )}
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

function Map({
  bounds,
  setBounds,
  customBoundaries,
  mode,
  filter,
  percentile,
  range,
  loadingStats,
}) {
  const [loadingDatas, setLoadingDatas] = useState(false);
  const [loadingTiles, setLoadingTiles] = useState(false);
  const clusterRef = useRef();
  const [geojson, setGeojson] = useState();
  let [zoom, lon, lat] = document.location.hash.substr(1).split('/');
  if (!(zoom && lon && lat)) [zoom, lon, lat] = defaultLocation;
  const loadAllData = zoom > zoomLevelSwitch;

  useEffect(() => {
    if (loadAllData && bounds && !loadingStats) {
      const query = new URLSearchParams({
        minx: bounds.getWest(),
        miny: bounds.getSouth(),
        maxx: bounds.getEast(),
        maxy: bounds.getNorth(),
        filter,
      }).toString();
      const options = {};
      if (customBoundaries) {
        const formData = new FormData();
        formData.append('geojson', JSON.stringify(customBoundaries));
        options.method = 'POST';
        options.body = formData;
      }
      setLoadingDatas(true);
      fetch(`/api/getData?${query}`, options)
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
          setLoadingDatas(false);
        })
        .catch((error) => {
          if (error.message === 'ohsome') {
            setLoadingDatas(false);
          } else {
            setLoadingDatas(false);
          }
        });
    }
  }, [loadingStats, bounds, customBoundaries]);

  const colormap = useMemo(() => {
    const newColormap = {};
    if (loadAllData && geojson && range) {
      const rangeDiff = range[1] - range[0];
      geojson.features.forEach((feature) => {
        const value = feature.properties[mode];
        const score = Math.abs(range[0] - value) / rangeDiff;
        const color = interpolateViridis(score);
        // eslint-disable-next-line no-param-reassign
        feature.properties.color = color;
        newColormap[color] = score;
      });
    }
    return newColormap;
  }, [geojson, mode, range]);

  // https://github.com/yuzhva/react-leaflet-markercluster/pull/162
  const iconCreateFn = useMemo(() => {
    return iconCreateFunction.bind(null, percentile, colormap);
  }, [percentile, colormap]);

  useEffect(() => {
    if (clusterRef.current) {
      clusterRef.current.refreshClusters();
    }
  }, [percentile, mode, geojson]);

  const toBeRemoved = [];
  const tileRef = useCallback(
    (tileLayer) => {
      if (tileLayer === null) {
        while (toBeRemoved.length) {
          L.DomUtil.remove(toBeRemoved.pop().el);
        }
      } else {
        // eslint-disable-next-line no-underscore-dangle
        if (!tileLayer._url) {
          setLoadingTiles(true);
          tileLayer.on('load', () => {
            while (toBeRemoved.length) {
              L.DomUtil.remove(toBeRemoved.pop().el);
            }
            setLoadingTiles(false);
          });
          tileLayer.on('loading', () => {
            setLoadingTiles(true);
          });

          // https://github.com/Leaflet/Leaflet/issues/6659
          // eslint-disable-next-line no-param-reassign, no-underscore-dangle
          tileLayer._removeTile = (key) => {
            // https://github.com/Leaflet/Leaflet/blob/8a1ccbe3c821ec501911d7d7b698af4b1636216c/src/layer/tile/GridLayer.js#L774-L788
            // eslint-disable-next-line no-underscore-dangle
            const tile = tileLayer._tiles[key];
            if (!tile) {
              return;
            }

            // DomUtil.remove(tile.el);
            toBeRemoved.push(tile);
            // eslint-disable-next-line no-param-reassign, no-underscore-dangle
            delete tileLayer._tiles[key];

            // @event tileunload: TileEvent
            // eslint-disable-next-line max-len
            // Fired when a tile is removed (e.g. when a tile goes off the screen).
            tileLayer.fire('tileunload', {
              tile: tile.el,
              // eslint-disable-next-line no-underscore-dangle
              coords: tileLayer._keyToTileCoords(key),
            });
          };
          // eslint-enable
        }
        if (range) {
          const query = new URLSearchParams({
            mode,
            percentile,
            filter,
            scale_min: range[0],
            scale_max: range[1],
          }).toString();
          tileLayer.setUrl(`tiles/{z}/{x}/{y}.png?${query}`);
        }
      }
    },
    [mode, percentile, filter, range]
  );

  // https://github.com/PaulLeCam/react-leaflet/issues/332
  const geojsonKey = useMemo(() => {
    return Math.random();
  }, [geojson, mode, range]);

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

      {customBoundaries && <GeoJSON data={customBoundaries} />}
      {loadAllData ? (
        <MarkerClusterGroup
          ref={clusterRef}
          iconCreateFunction={iconCreateFn}
          spiderfyOnMaxZoom={false}
          disableClusteringAtZoom={19}
        >
          <GeoJSON
            key={geojsonKey}
            data={geojson}
            pointToLayer={pointToLayer}
          />
        </MarkerClusterGroup>
      ) : (
        <TileLayer
          ref={tileRef}
          url=""
          tileSize={512}
          zoomOffset={-1}
          opacity={0.5}
          zIndex={1}
          maxZoom={zoomLevelSwitch}
          updateWhenZooming={false}
          className="pixelated"
        />
      )}

      <CustomControl mode={mode} range={range} />
      <AttributionControl position="bottomright" prefix="" />
      {(loadingStats || loadingDatas || loadingTiles) && (
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
