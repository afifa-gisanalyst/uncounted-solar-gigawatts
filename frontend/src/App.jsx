import { useEffect, useMemo, useState } from "react";

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  MapPin,
  Building2,
  Sun,
  SquareDashed,
  Calculator,
  ChevronDown,
  Info,
  Maximize,
  ZoomIn,
  ZoomOut,
  Layers,
  Zap,
  Lightbulb,
  SolarPanelIcon,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./App.css";

const { BaseLayer, Overlay } = LayersControl;

/* =========================================================
   CITY DATA
   ========================================================= */

const CITIES = {
  Islamabad: {
    code: "ISLD",
    center: [33.6844, 73.0479],
    zoom: 12,

    boundary: "/data/ISLD/Islamabad_boundary.geojson",
    buildings: "/data/ISLD/Islamabad_Buildings_all_stats.geojson",
    solar: "/data/ISLD/Islamabad_solarPV.geojson",
  },

  Lahore: {
    code: "LHR",
    center: [31.5204, 74.3587],
    zoom: 12,

    boundary: "/data/LHR/Lahore_Boundary.geojson",
    buildings: "/data/LHR/Lahore_buildings_all_stats.geojson",
    solar: "/data/LHR/Lahore_solarPV.geojson",
  },

  Karachi: {
    code: "KHI",
    center: [24.8607, 67.0011],
    zoom: 12,

    boundary: "/data/KHI/karachi_boundary.geojson",
    buildings: "/data/KHI/Karachi_building_all_stats_.geojson",
    solar: "/data/KHI/karachi_solarPV.geojson",
  },
};

/* =========================================================
   SOLAR FORMULAS
   ========================================================= */

const PANEL_AREA_SQM = 2.58;
const PANEL_RATING_W = 580;

/*
  Number of Panels
  = Total Solar PV Area / 2.58 sqm

  Installed Capacity
  = Number of Panels × 580 W

  kW
  = Watts / 1000
*/

/* =========================================================
   HELPERS
   ========================================================= */

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, decimals = 2) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function findProperty(properties, possibleNames) {
  if (!properties) return 0;

  const keys = Object.keys(properties);

  /* Exact / case-insensitive match */
  for (const desired of possibleNames) {
    const exact = keys.find(
      (key) => key.toLowerCase() === desired.toLowerCase()
    );

    if (exact) {
      return toNumber(properties[exact]);
    }
  }

  /* Normalized match */
  const normalizedKeys = keys.map((key) => ({
    original: key,
    normalized: key
      .toLowerCase()
      .replace(/[\s_-]/g, ""),
  }));

  for (const desired of possibleNames) {
    const target = desired
      .toLowerCase()
      .replace(/[\s_-]/g, "");

    const found = normalizedKeys.find(
      (item) => item.normalized === target
    );

    if (found) {
      return toNumber(properties[found.original]);
    }
  }

  return 0;
}

/* =========================================================
   GEOJSON PROPERTY HELPERS
   ========================================================= */

function getSolarArea(properties) {
  return findProperty(properties, [
    "SolarPV_Area",
    "SolarPV_Area(sqm)",
    "SolarPV Area",
    "solarPV_area",
    "solar_pv_area",
    "solar_area",
  ]);
}

function getRooftopArea(properties) {
  return findProperty(properties, [
    "Rooftop_Area",
    "Rooftop_Area(sqm)",
    "Rooftop Area",
    "rooftop_area",
    "rooftoparea",
  ]);
}

function getAOIArea(properties) {
  return findProperty(properties, [
    "Boundary_Area",
    "Boundary_Area(sqm)",
    "AOI_Area",
    "AOI_Area(sqm)",
    "AOIArea",
    "Area",
    "area",
  ]);
}

/* =========================================================
   AOI AREA
   ========================================================= */

function calculateAOIArea(boundary) {
  if (!boundary?.features?.length) {
    return 0;
  }

  let total = 0;

  for (const feature of boundary.features) {
    total += getAOIArea(feature.properties);
  }

  return total;
}

/* =========================================================
   FIT MAP TO CITY
   ========================================================= */

function FitCityToBoundary({ boundary, city }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    /* First move immediately to the selected city */
    const cityConfig = CITIES[city];

    if (cityConfig) {
      map.setView(cityConfig.center, cityConfig.zoom, {
        animate: true,
      });
    }

    /* Then fit exactly to the boundary once loaded */
    if (!boundary) return;

    try {
      const layer = L.geoJSON(boundary);
      const bounds = layer.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 14,
          animate: true,
        });
      }
    } catch (error) {
      console.error("Unable to fit boundary:", error);

      if (cityConfig) {
        map.setView(cityConfig.center, cityConfig.zoom);
      }
    }
  }, [boundary, city, map]);

  return null;
}

/* =========================================================
   MAP CONTROLS
   ========================================================= */

function CustomMapControls() {
  const map = useMap();

  const zoomIn = () => map.zoomIn();

  const zoomOut = () => map.zoomOut();

  const resetView = () => {
    const city =
      Object.keys(CITIES).find((name) => {
        const center = CITIES[name].center;
        const current = map.getCenter();

        return (
          Math.abs(current.lat - center[0]) < 2 &&
          Math.abs(current.lng - center[1]) < 2
        );
      }) || "Islamabad";

    map.setView(CITIES[city].center, CITIES[city].zoom, {
      animate: true,
    });
  };

  const fullscreen = () => {
    const mapElement = map.getContainer();

    if (!document.fullscreenElement) {
      mapElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };
}

/* =========================================================
   SUMMARY CARD
   ========================================================= */

function SummaryCard({
  icon,
  title,
  value,
  unit,
  tone = "teal",
}) {
  return (
    <div className="summary-card">

      <div className={`summary-icon ${tone}`}>
        {icon}
      </div>

      <div className="summary-content">

        <div className="summary-label">
          {title}
        </div>

        <div className="summary-value">
          {value}

          {unit && (
            <span className="summary-unit">
              {unit}
            </span>
          )}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   BOTTOM KPI CARD
   ========================================================= */

function KPI({ icon, title, value, description, tone }) {
  return (
    <article className="kpi-card">

      <div className={`kpi-icon ${tone}`}>
        {icon}
      </div>

      <div className="kpi-content">

        <div className="kpi-title">
          {title}
        </div>

        <div className="kpi-value">
          {value}
        </div>

        <div className="kpi-description">
          {description}
        </div>

      </div>

    </article>
  );
}

/* =========================================================
   LAYER TOGGLE
   ========================================================= */

function LayerToggle({
  label,
  color,
  checked,
  onChange,
}) {
  return (
    <div className="layer-row">

      <div className="layer-name">

        <span
          className={`layer-color ${color}`}
        />

        <span>{label}</span>

      </div>

      <button
        className={`switch ${checked ? "active" : ""}`}
        onClick={onChange}
        aria-label={`Toggle ${label}`}
      >
        <span />
      </button>

    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {

  const [city, setCity] = useState("Islamabad");

  const [boundary, setBoundary] = useState(null);
  const [buildings, setBuildings] = useState(null);
  const [solar, setSolar] = useState(null);

  const [showBoundary, setShowBoundary] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showSolar, setShowSolar] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cityConfig = CITIES[city];

  /* =======================================================
     LOAD CITY DATA
     ======================================================= */

  useEffect(() => {

    let cancelled = false;

    async function loadCityData() {

      setLoading(true);
      setError("");

      setBoundary(null);
      setBuildings(null);
      setSolar(null);

      try {

        const responses = await Promise.all([
          fetch(cityConfig.boundary),
          fetch(cityConfig.buildings),
          fetch(cityConfig.solar),
        ]);

        const failedResponse = responses.find(
          (response) => !response.ok
        );

        if (failedResponse) {
          throw new Error(
            `GeoJSON request failed: ${failedResponse.status}`
          );
        }

        const [
          boundaryData,
          buildingsData,
          solarData,
        ] = await Promise.all(
          responses.map((response) => response.json())
        );

        if (cancelled) return;

        setBoundary(boundaryData);
        setBuildings(buildingsData);
        setSolar(solarData);

      } catch (err) {

        console.error(
          `Failed loading ${city}:`,
          err
        );

        if (!cancelled) {

          setError(
            `Could not load ${city} GeoJSON data. Please check the files inside frontend/public/data/${cityConfig.code}.`
          );

        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    }

    loadCityData();

    return () => {
      cancelled = true;
    };

  }, [cityConfig, city]);

  /* =======================================================
     CALCULATIONS
     ======================================================= */

  const metrics = useMemo(() => {

    const buildingFeatures =
      buildings?.features || [];

    const solarFeatures =
      solar?.features || [];

    /* Total rooftop area */
    const totalRooftopArea =
      buildingFeatures.reduce(
        (sum, feature) =>
          sum +
          getRooftopArea(
            feature.properties
          ),
        0
      );

    /* Total solar PV area */
    const totalSolarArea =
      solarFeatures.reduce(
        (sum, feature) =>
          sum +
          getSolarArea(
            feature.properties
          ),
        0
      );

    /* Panels = Solar Area / 2.58 */
    const estimatedPanels =
      totalSolarArea /
      PANEL_AREA_SQM;

    /* Capacity = Panels × 580W */
    const installedCapacityW =
      estimatedPanels *
      PANEL_RATING_W;

    const installedCapacityKW =
      installedCapacityW / 1000;

    const installedCapacityMW =
      installedCapacityKW / 1000;

    /* Counts */
    const buildingCount =
      buildingFeatures.length;

    const solarSiteCount =
      solarFeatures.length;

    /* AOI */
    const aoiAreaSqm =
      calculateAOIArea(boundary);

    /* Solar coverage */
    const solarCoverage =
      totalRooftopArea > 0
        ? (totalSolarArea /
            totalRooftopArea) *
          100
        : 0;

    return {
      totalRooftopArea,
      totalSolarArea,
      estimatedPanels,
      installedCapacityW,
      installedCapacityKW,
      installedCapacityMW,
      buildingCount,
      solarSiteCount,
      aoiAreaSqm,
      solarCoverage,
    };

  }, [boundary, buildings, solar]);

  /* =======================================================
     RENDER
     ======================================================= */

  return (

    <div className="app-shell">

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="top-header">

        <div className="brand">

          <img
            src="/assets/HX Logo.png"
            alt="HeraldX"
            className="brand-logo"
          />

          <div className="brand-divider" />

          <div className="brand-copy">

            <strong>
              HeraldX
            </strong>

            <span>
              analytics
            </span>

          </div>

        </div>

        <div className="header-title">

          <div className="header-main-title">
            UNCOUNTED SOLAR GIGAWATTS
          </div>

          <div className="header-subtitle">
            Mapping Rooftops; Estimating Solar Potential
          </div>

        </div>

        <div className="header-about">

          <Info size={15} />

          <span>
            About
          </span>

        </div>

      </header>

      {/* =================================================
          DASHBOARD BODY
          ================================================= */}

      <div className="dashboard-body">

        {/* =================================================
            SIDEBAR
            ================================================= */}

        <aside className="sidebar">

          {/* AREA SELECTION */}

          <section className="sidebar-section">

            <div className="section-title">

              <MapPin size={15} />

              <span>
                AREA SELECTION
              </span>

            </div>

            <label className="select-label">
              Select City 
            </label>

            <div className="select-wrapper">

              <select
                value={city}
                onChange={(event) =>
                  setCity(
                    event.target.value
                  )
                }
              >

                <option value="Islamabad">
                  Islamabad
                </option>

                <option value="Lahore">
                  Lahore
                </option>

                <option value="Karachi">
                  Karachi
                </option>

              </select>

              <ChevronDown
                size={17}
                className="select-arrow"
              />

            </div>

          </section>

          {/* SUMMARY */}

          <section className="sidebar-section">

            <div className="summary-heading">

              SUMMARY

              <span>
                ({city})
              </span>

            </div>

            <div className="summary-stack">

              <SummaryCard
                icon={<Zap size={21} />}
                title="Installed Capacity"
                value={formatNumber(
                  metrics.installedCapacityKW
                )}
                unit=" kW"
                tone="orange"
              />

              <SummaryCard
                icon={<Sun size={21} />}
                title="Total Solar PV Area"
                value={formatNumber(
                  metrics.totalSolarArea
                )}
                unit=" sqm"
                tone="orange"
              />

              <SummaryCard
                icon={<Building2 size={21} />}
                title="Total Rooftop Area"
                value={formatNumber(
                  metrics.totalRooftopArea
                )}
                unit=" sqm"
                tone="teal"
              />

              <SummaryCard
                icon={<SquareDashed size={21} />}
                title="Total AOI Area"
                value={formatNumber(
                  metrics.aoiAreaSqm
                )}
                unit=" sqm"
                tone="blue"
              />

              <SummaryCard
                icon={<Calculator size={21} />}
                title="Estimated No. of Solar Panels"
                value={formatNumber(
                  metrics.estimatedPanels,
                  0
                )}
                tone="purple"
              />

            </div>

            <div className="units-note">
              All areas are in square meters (sqm)
            </div>

          </section>

          {/* MAP LAYERS */}

          <section className="sidebar-section layers-section">

            <div className="section-title layers-heading">

              <Layers size={15} />

              <span>
                MAP LAYERS
              </span>

            </div>

            <LayerToggle
              label="AOI Boundary"
              color="blue"
              checked={showBoundary}
              onChange={() =>
                setShowBoundary(
                  !showBoundary
                )
              }
            />

            <LayerToggle
              label="Buildings"
              color="teal"
              checked={showBuildings}
              onChange={() =>
                setShowBuildings(
                  !showBuildings
                )
              }
            />

            <LayerToggle
              label="Solar PV"
              color="orange"
              checked={showSolar}
              onChange={() =>
                setShowSolar(
                  !showSolar
                )
              }
            />

          </section>

        </aside>

        {/* =================================================
            MAIN CONTENT
            ================================================= */}

        <main className="main-content">

          <div className="page-heading">
            SOLAR PV ANALYTICS
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {/* =================================================
              MAP
              ================================================= */}

          <section className="map-card">

            <div className="map-header">

              <div className="map-title">

                <div className="map-title-icon">
                  <MapPin size={17} />
                </div>

                <div>

                  <h2>
                    {city} Solar PV Map
                  </h2>

                  <span>
                  
                  </span>

                </div>

              </div>

              <div className="map-header-actions">

                {loading && (
                  <span className="loading-text">
                    Loading data...
                  </span>
                )}

                <button
                  title="Fullscreen"
                  onClick={() => {
                    const mapElement =
                      document.querySelector(
                        ".leaflet-map"
                      );

                    mapElement?.requestFullscreen?.();
                  }}
                >
                  <Maximize size={16} />
                </button>

              </div>

            </div>

            <div className="map-wrapper">

              <MapContainer
                key={city}
                center={cityConfig.center}
                zoom={cityConfig.zoom}
                scrollWheelZoom={true}
                className="leaflet-map"
              >

                {/* BASEMAPS */}

                <LayersControl position="topright">

                  {/* GOOGLE SATELLITE */}

                  <BaseLayer
                    checked
                    name="Google Satellite"
                  >

                    <TileLayer
                      attribution="&copy; Google"
                      url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    />

                  </BaseLayer>

                  {/* ROAD MAP */}

                  <BaseLayer name="Road Map">

                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                  </BaseLayer>

                  {/* GOOGLE MAP LABELS */}

                  <Overlay name="Labels">

                    <TileLayer
                      attribution="&copy; Google"
                      url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
                    />

                  </Overlay>

                </LayersControl>

                {/* AOI BOUNDARY */}

                {showBoundary && boundary && (

                  <GeoJSON
                    data={boundary}
                    style={{
                      color: "#1684ff",
                      weight: 2.5,
                      fillColor: "#1684ff",
                      fillOpacity: 0,
                    }}
                  />

                )}

                {/* BUILDINGS */}

                {showBuildings && buildings && (

                  <GeoJSON
                    data={buildings}
                    style={{
                      color: "#1ba098",
                      weight: 1.5,
                      fillColor: "#1ba098",
                      fillOpacity: 0.3,
                    }}

                    onEachFeature={(
                      feature,
                      layer
                    ) => {

                      const rooftop =
                        getRooftopArea(
                          feature.properties
                        );

                      const solarArea =
                        getSolarArea(
                          feature.properties
                        );

                      const panels =
                        solarArea /
                        PANEL_AREA_SQM;

                      const capacityKW =
                        (panels *
                          PANEL_RATING_W) /
                        1000;

                      layer.bindPopup(`

                        <div class="popup-content">

                          <h4>
                            Rooftop Information
                          </h4>

                          <div class="popup-row">

                            <span>
                              Solar PV Area (sqm)
                            </span>

                            <strong>
                              ${formatNumber(
                                solarArea
                              )}
                            </strong>

                          </div>

                          <div class="popup-row">

                            <span>
                              Rooftop Area (sqm)
                            </span>

                            <strong>
                              ${formatNumber(
                                rooftop
                              )}
                            </strong>

                          </div>

                          <div class="popup-row">

                            <span>
                              Estimated Panels
                            </span>

                            <strong>
                              ${formatNumber(
                                panels,
                                0
                              )}
                            </strong>

                          </div>

                          <div class="popup-row">

                            <span>
                              Installed Capacity
                            </span>

                            <strong>
                              ${formatNumber(
                                capacityKW
                              )} kW
                            </strong>

                          </div>

                        </div>

                      `);

                    }}

                  />

                )}

                {/* SOLAR PV */}

                {showSolar && solar && (

                  <GeoJSON
                    data={solar}

                    style={{
                      color: "#f5a623",
                      weight: 1,
                      fillColor: "#f5a623",
                      fillOpacity: 0.75,
                    }}

                    onEachFeature={(
                      feature,
                      layer
                    ) => {

                      const solarArea =
                        getSolarArea(
                          feature.properties
                        );

                      const panels =
                        solarArea /
                        PANEL_AREA_SQM;

                      const capacityKW =
                        (panels *
                          PANEL_RATING_W) /
                        1000;

                      layer.bindPopup(`

                        <div class="popup-content">

                          <h4>
                            Solar PV Information
                          </h4>

                          <div class="popup-row">

                            <span>
                              Solar PV Area (sqm)
                            </span>

                            <strong>
                              ${formatNumber(
                                solarArea
                              )}
                            </strong>

                          </div>

                          <div class="popup-row">

                            <span>
                              Estimated Panels
                            </span>

                            <strong>
                              ${formatNumber(
                                panels,
                                0
                              )}
                            </strong>

                          </div>

                          <div class="popup-row">

                            <span>
                              Installed Capacity
                            </span>

                            <strong>
                              ${formatNumber(
                                capacityKW
                              )} kW
                            </strong>

                          </div>

                        </div>

                      `);

                    }}

                  />

                )}

                {/* AUTOMATIC CITY MOVE */}

                <FitCityToBoundary
                  boundary={boundary}
                  city={city}
                />

                <CustomMapControls />

              </MapContainer>

              {/* MAP LEGEND */}

              <div className="map-legend">

                <div className="legend-title">
                  LAYERS
                </div>

                <div className="legend-item">

                  <span className="legend-line boundary" />

                  AOI Boundary

                </div>

                <div className="legend-item">

                  <span className="legend-square buildings" />

                  Buildings

                </div>

                <div className="legend-item">

                  <span className="legend-square solar" />

                  Solar PV

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              BOTTOM KPI CARDS
              ================================================= */}

          <section className="kpi-grid">

            <KPI
              icon={<Lightbulb size={25} />}
              title="Solar Coverage of Rooftops"
              value={`${formatNumber(
                metrics.solarCoverage
              )}%`}
              description={`Solar PV area is ${formatNumber(
                metrics.solarCoverage
              )}% of the total rooftop area in the selected AOI.`}
              tone="blue"
            />

            <KPI
              icon={<Building2 size={25} />}
              title="Buildings"
              value={metrics.buildingCount.toLocaleString()}
              description="Total buildings in the selected AOI."
              tone="teal"
            />

            <KPI
              icon={<SolarPanelIcon size={25} />}
              title="Solar PV Sites"
              value={metrics.solarSiteCount.toLocaleString()}
              description="Total solar PV installations detected."
              tone="orange"
            />

          </section>

        </main>

      </div>

      {/* =================================================
          FOOTER
          ================================================= */}

      <footer className="app-footer">

        <span>
          © 2026 HeraldX
        </span>

      </footer>

    </div>
  );
}