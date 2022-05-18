import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOMServer from 'react-dom/server';

import DeckGL from '@deck.gl/react';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import {BitmapLayer} from '@deck.gl/layers';
import {TileLayer} from '@deck.gl/geo-layers';

import {Map as MapGL, _MapContext as MapContext, AttributionControl, NavigationControl, Source, Layer } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { interpolateViridis } from 'd3-scale-chromatic';

import {
  customAttribution,
  tileURL,
  dataTileURL,
  maxZoom,
  minZoom,
  valuesBlacklist,
  modes,
  INITIAL_VIEW_STATE,
} from './constants';

import './map.css';

import 'bootstrap/dist/css/bootstrap.css';

import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';

const compute_percentile = require('percentile');

let colour = 0;
const style = document.createElement('style');
document.head.appendChild(style);
function applyColor() {
  while (style.sheet.cssRules.length) {
    style.sheet.deleteRule(0);
  }
  style.sheet.insertRule(
    `.leaflet-tile-pane > .leaflet-layer:first-of-type > .leaflet-tile-container { filter: grayscale(${100 - colour}%); }`,
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
  const aggregated = compute_percentile(percentile, values);
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

const osm = 'https://www.openstreetmap.org';
const wiki = 'https://wiki.openstreetmap.org/wiki';
function generatePopup(feature, marker) {
  const type = feature.geometry.type === 'Point' ? 'node' : 'way';
  fetch(`/api/getFeature?feature_type=${type}&feature_id=${feature.properties.id}`)
    .then((response) => {
      return response.json();
    })
    .then((parsed) => {
      let node = parsed.elements[0];
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
                      <a href={`${wiki}/Key:${key}`} target="_blank">
                        {key}
                      </a>
                      {': '}
                      {key.match(valuesBlacklist) ? (
                        <>{node.tags[key]}</>
                      ) : (
                        <a
                          href={`${wiki}/Tag:${key}%3D${node.tags[key]}`}
                          target="_blank"
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
              >
                Edit
              </a>
              {' | '}
              <a
                href={`${osm}/${type}/${feature.properties.id}/history`}
                target="_blank"
              >
                History
              </a>
              {' | '}
              <a
                href={`${osm}/${type}/${feature.properties.id}`}
                target="_blank"
              >
                Details
              </a>
            </div>
          </>
        )
      );
    })
    .catch((error) => {
      console.log(error);
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
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  const clusterRef = useRef(null);
  const tileRef = useRef(null);
  let [zoom, lon, lat] = document.location.hash.substr(1).split('/');
  const [colormap, worstId, worst, bestId, best] = useMemo(() => {
    const colormap = {};
    const { getValue } = modes[props.mode];
    let worst = modes[props.mode].defaultWorstValue;
    let worstId = null;
    let best = modes[props.mode].defaultBestValue;
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
    return [colormap, worstId, worst, bestId, best];
  }, [props.geojson, props.mode]);

  const worstPretty = modes[props.mode].prettyValue(worst);
  const bestPretty = modes[props.mode].prettyValue(best);

  // https://github.com/yuzhva/react-leaflet-markercluster/pull/162
  const iconCreateFn = useMemo(() => {
    return iconCreateFunction.bind(null, props.percentile, colormap);
  }, [props.percentile, colormap]);

  useEffect(() => {
    if (clusterRef.current) clusterRef.current.refreshClusters();
  }, [props.percentile, props.mode, props.geojson]);

  const params = (new URLSearchParams({
    mode: props.mode,
    percentile: props.percentile,
    scale_min: modes[props.mode] ? worst : best,
    scale_max: modes[props.mode] ? best : worst,
  })).toString();

  const dataTileURL_with_params = dataTileURL+"?"+params;
  useEffect(() => {
    if (tileRef.current) {
      tileRef.current.setUrl(dataTileURL_with_params);
    }
  }, [params]);


  function renderSubLayers(props) {
    const {
      bbox: {west, south, east, north}
    } = props.tile;
    return new BitmapLayer(props, {
      data: null,
      image: props.data,
      bounds: [west, south, east, north]
    });  
  }

  const mapRef = useRef();

  return (
      <MapGL
        initialViewState={viewState}
      >
            <Source
          type="raster"
          tiles={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
          tileSize={256}
          maxZoom={19}
        >
          <Layer type="raster"/>
        </Source>
      
      <DeckGL
        controller={false}
        >
      <HexagonLayer
         data={'/api/getData?minx=9.1&miny=45.45&maxx=9.2&maxy=45.46'}
         onViewStateChange={e => setViewState(e.viewState)}
         colorAggregation={'MEAN'}
         getColorWeight={point => point.properties.version}
         extruded={false}
         getPosition={d => d.coordinates}
         radius={50}
         opacity={0.3}
       />
    </DeckGL>
    
            <NavigationControl />
          <AttributionControl customAttribution={customAttribution} />


      </MapGL>
  );
}

export default Map;
