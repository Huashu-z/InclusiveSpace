import * as React from "react"; 
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Stack as Stack__,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  useDollarState
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";
import Header from "../../Header";
import "@plasmicapp/react-web/lib/plasmic.css"; 
import projectcss from "./plasmic.module.css";
import sty from "./PlasmicUser.module.css";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import Sidebar from "../../Sidebar";
import LayerTagBar from "@/components/LayerTagBar";
import Profile from "../../Profile";
import { cityLayerConfig } from "../../cityVariableConfig";
import { useTranslation } from "next-i18next";

const MapComponent = dynamic(() => import("../../MapComponent"), { ssr: false });
const cityCenters = {
  hamburg: [53.5503, 9.9920],
  penteli: [38.0491, 23.8653]
};

createPlasmicElementProxy;

export const PlasmicUser__VariantProps = [];
export const PlasmicUser__ArgProps = [];

function useNextRouter() {
  try {
    return useRouter();
  } catch {}
  return undefined;
}

function PlasmicUser__RenderFunc(props) {
  const { variants, overrides, forNode } = props;
  const { t } = useTranslation("common");
  const [selectingStart, setSelectingStart] = React.useState(false);
  const [startPoints, setStartPoints] = React.useState([]);
  const [computeAccessibility, setComputeAccessibility] = React.useState(false);
  const [walkingTime, setWalkingTime] = React.useState(15);
  const [walkingSpeed, setWalkingSpeed] = React.useState(5);
  const [selectedLayers, setSelectedLayers] = React.useState([]);
  const [enabledVariables, setEnabledVariables] = React.useState([]);
  const [layerValues, setLayerValues] = React.useState({});
  const [availableLayers, setAvailableLayers] = React.useState([]);
  const [openCategory, setOpenCategory] = React.useState(null);
  const [showInfo, setShowInfo] = React.useState(false);
  const [resetTrigger, setResetTrigger] = React.useState(false);
  const [clearTrigger, setClearTrigger] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [highlightedIndex, setHighlightedIndex] = React.useState(null);
  const [cityCenter, setCityCenter] = React.useState([53.5503, 9.9920]); // hamburg as default
  const [selectedCity, setSelectedCity] = React.useState("hamburg");
  const [userProfile, setUserProfile] = React.useState(null);
  const [isSearchZoom, setIsSearchZoom] = React.useState(false);
  const [latestResultMetadata, setLatestResultMetadata] = React.useState([]);
 
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("helpShown")) {
      setShowHelp(true);
      sessionStorage.setItem("helpShown", "true");
    }
  }, []);


  React.useEffect(() => {
    const storedCenter = localStorage.getItem("selectedCityCenter");
    if (storedCenter) {
      try {
        setCityCenter(JSON.parse(storedCenter));
      } catch (e) {
        console.error("Invalid city center in storage", e);
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const city = localStorage.getItem("selectedCity") || "hamburg";
      setSelectedCity(city);
      setAvailableLayers(cityLayerConfig?.[city]?.mapLayers || []);
    }
  }, []);

  React.useEffect(() => {
    setAvailableLayers(cityLayerConfig?.[selectedCity]?.mapLayers || []);
  }, [selectedCity]);

  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const handleResetResults = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(t("reset_address_warning"));
      if (!confirmed) return;
    }
    setComputeAccessibility(false);
    setStartPoints([]);
    setResetTrigger(true);
    // setEnabledVariables([]);
    // setLayerValues({}); 
  };
  const handleClearResult = () => {
    setClearTrigger(true);
  };
  const handleClearVariables = () => {
    setEnabledVariables([]);
    setLayerValues({});
    setUserProfile(null);
  };

  const normalizeAgentSettingKey = (key) => {
    const keyMap = {
      wc_disabled: "wcDisabled",
      sidewalk_narrow: "narrowRoads",
      poor_pavement: "poorPavement",
      kerbs_high: "kerbsHigh",
      tactile_guidance: "tactile_pavement",
      tactile: "tactile_pavement",
      traffic_light: "trafficLight",
      trafic_light: "trafficLight",
      streetlight: "light",
      slope_penteli: "slope",
      pedestrian_flow: "pedestrianFlow",
      facilities: "facility",
      facility_wms: "facility",
      transport_station: "station",
      temp_summer: "temperatureSummer",
      temp_winter: "temperatureWinter"
    };
    return keyMap[key] || key;
  };

  const getSupportedAgentSettings = (settings) => {
    const supportedFeatures = new Set(cityLayerConfig?.[selectedCity]?.discomfortFeatures || []);
    return Object.entries(settings || {}).reduce((acc, [rawKey, rawValue]) => {
      const key = normalizeAgentSettingKey(rawKey);
      const value = Number(rawValue);
      if (!supportedFeatures.has(key) || !Number.isFinite(value)) return acc;
      acc[key] = Math.max(0.1, Math.min(1, value));
      return acc;
    }, {});
  };

  const handleApplyAgentSettings = (settings) => {
    const supportedSettings = getSupportedAgentSettings(settings);
    if (Object.keys(supportedSettings).length === 0) return;
    setLayerValues((prev) => ({ ...prev, ...supportedSettings }));
    setEnabledVariables((prev) => {
      const next = new Set(prev);
      Object.keys(supportedSettings).forEach((key) => next.add(key));
      return Array.from(next);
    });
  };

  const handleRunAgentComputation = ({ startPointOverride } = {}) => {
    if (startPointOverride) {
      setStartPoints((prev) =>
        Array.isArray(prev) ? [...prev, startPointOverride] : [startPointOverride]
      );
      setIsSearchZoom(true);
    }

    if (startPoints.length === 0 && !startPointOverride) return false;

    setComputeAccessibility(false);
    window.setTimeout(() => {
      setComputeAccessibility(true);
    }, 0);
    return true;
  };

  const handleExecuteAgentAction = (action, { run = false } = {}) => {
    if (!action || action.type === "ANSWER_ONLY") return false;

    if (action.city && action.city !== selectedCity && cityLayerConfig[action.city]) {
      setSelectedCity(action.city);
      localStorage.setItem("selectedCity", action.city);
      setAvailableLayers(cityLayerConfig[action.city]?.mapLayers || []);
      if (cityCenters[action.city]) {
        setCityCenter(cityCenters[action.city]);
        localStorage.setItem("selectedCityCenter", JSON.stringify(cityCenters[action.city]));
      }
    }

    if (Number.isFinite(Number(action.walkingTime))) {
      setWalkingTime(Number(action.walkingTime));
    }
    if (Number.isFinite(Number(action.walkingSpeed))) {
      setWalkingSpeed(Number(action.walkingSpeed));
    }

    if (Array.isArray(action.enabledVariables)) {
      setEnabledVariables(action.enabledVariables);
    }
    if (action.layerValues && typeof action.layerValues === "object") {
      setLayerValues(action.layerValues);
    }
    if (action.profile) {
      setUserProfile((prev) => ({
        ...(prev || {}),
        id: action.profile,
        presetId: action.profile,
        label: action.profile,
      }));
    }

    const hasCoordinates = Array.isArray(action.coordinates) &&
      action.coordinates.length === 2 &&
      action.coordinates.every((value) => Number.isFinite(Number(value)));

    if (hasCoordinates) {
      setStartPoints([action.coordinates]);
      setCityCenter([action.coordinates[1], action.coordinates[0]]);
      setIsSearchZoom(true);
    } else {
      setSelectingStart(true);
      if (run) return false;
    }

    if (run && hasCoordinates) {
      setComputeAccessibility(false);
      window.setTimeout(() => {
        setComputeAccessibility(true);
      }, 0);
    }

    return true;
  };

  const onLoadDemoScenario = (scenario) => {
    if (!scenario) return;
    if (scenario.map?.city) {
      setSelectedCity(scenario.map.city);
      localStorage.setItem("selectedCity", scenario.map.city);
    }
    if (scenario.map?.center) {
      setCityCenter(scenario.map.center);
    }
    if (Array.isArray(scenario.selectedLayers)) {
      setSelectedLayers(scenario.selectedLayers);
    }
    if (scenario.startPoint) {
      setStartPoints([scenario.startPoint]);
    } else {
      setStartPoints([]);
    }
    if (scenario.userProfile) {
      setUserProfile(scenario.userProfile);
    }
    if (typeof scenario.question === "string") {
      // AgentPanel will also set the prompt text internally
    }
  };

  const onResetHandled = () => {
    setResetTrigger(false);
  };
  const onClearHandled = () => {
    setClearTrigger(false);
  };

  const toggleVariable = (layer) => {
    setEnabledVariables((prev) => {
      const isSelected = prev.includes(layer);
      const newEnabled = isSelected
        ? prev.filter((l) => l !== layer)
        : [...prev, layer];
      if (!isSelected) {
        setLayerValues((prevValues) => ({
          ...prevValues,
          [layer]: prevValues[layer] ?? 1.0
        }));
      }
      if (isSelected) {
        setLayerValues((prevValues) => {
          const updated = { ...prevValues };
          delete updated[layer];
          return updated;
        });
      }

      return newEnabled;
    });
  };

  const toggleLayer = (layer) => {
    setSelectedLayers((prev) => {
      const newLayers = prev.includes(layer)
        ? prev.filter((l) => l !== layer)
        : [...prev, layer];
      if (!prev.includes(layer)) {
        setLayerValues((prevValues) => ({
          ...prevValues,
          [layer]: prevValues[layer] || 1.0,
        }));
      }
      return newLayers;
    });
  };

  const handleInputChange = (event, layer) => {
    const value = parseFloat(event.target.value);
    setLayerValues((prev) => ({
      ...prev,
      [layer]: isNaN(value) ? prev[layer] || 1.0 : value,
    }));
  };

  return (
    <React.Fragment>
      <Head></Head>
      <style>{`body { margin: 0; }`}</style>
      <div className={projectcss.plasmic_page_wrapper}>
        <Stack__
          as="div"
          data-plasmic-name="root"
          data-plasmic-override={overrides?.root}
          data-plasmic-root
          data-plasmic-for-node={forNode}
          hasGap
          className={classNames(
            projectcss.all,
            projectcss.root_reset,
            projectcss.plasmic_default_styles,
            projectcss.plasmic_mixins,
            projectcss.plasmic_tokens, 
            sty.root
          )}
        >
          <Header 
            showHelp={showHelp}
            setShowHelp={setShowHelp}
            variant="map"
            data-plasmic-name="header"
            data-plasmic-override={overrides?.header}
            className={classNames("__wab_instance", sty.header)}
          />
          <div data-plasmic-name="mapBox" data-plasmic-override={overrides?.mapBox} className={classNames(projectcss.all, sty.mapBox)} id="map">
            <Profile
              setEnabledVariables={setEnabledVariables}
              setLayerValues={setLayerValues}
              setWalkingSpeed={setWalkingSpeed}
              setWalkingTime={setWalkingTime}
              setUserProfile={setUserProfile}
            />
            <Sidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              enabledVariables={enabledVariables}
              toggleVariable={toggleVariable}
              selectedLayers={selectedLayers}
              toggleLayer={toggleLayer}
              layerValues={layerValues}
              availableLayers={availableLayers}
              handleInputChange={handleInputChange}
              walkingTime={walkingTime}
              setWalkingTime={setWalkingTime}
              walkingSpeed={walkingSpeed}
              setWalkingSpeed={setWalkingSpeed}
              setSelectingStart={setSelectingStart}
              selectingStart={selectingStart}
              startPoints={startPoints}
              setStartPoints={setStartPoints} 
              setComputeAccessibility={setComputeAccessibility}
              handleResetResults={handleResetResults}
              handleClearResult={handleClearResult}
              handleClearVariables={handleClearVariables}
              openCategory={openCategory}
              toggleCategory={toggleCategory}
              showInfo={showInfo}
              setShowInfo={setShowInfo}
              isSearchZoom={isSearchZoom}
              setIsSearchZoom={setIsSearchZoom}
              agentProfile={userProfile}
              selectedCity={selectedCity}
              resultMetadata={latestResultMetadata}
              onApplyAgentSettings={handleApplyAgentSettings}
              onRunAgentComputation={handleRunAgentComputation}
              onExecuteAgentAction={handleExecuteAgentAction}
              onLoadDemoScenario={onLoadDemoScenario}
            />  
            <LayerTagBar
              selectedLayers={selectedLayers}
              toggleLayer={toggleLayer}
              availableLayers={availableLayers}
            />
            <MapComponent
              cityCenter={cityCenter}
              selectedLayers={selectedLayers}
              availableLayers={availableLayers}
              enabledVariables={enabledVariables}
              selectingStart={selectingStart}
              setSelectingStart={setSelectingStart}
              walkingTime={walkingTime}
              walkingSpeed={walkingSpeed}
              startPoints={startPoints}
              setStartPoints={setStartPoints}
              computeAccessibility={computeAccessibility}
              setComputeAccessibility={setComputeAccessibility}
              resetTrigger={resetTrigger}
              onResetHandled={onResetHandled}
              clearTrigger={clearTrigger}
              onClearHandled={onClearHandled}
              layerValues={layerValues}
              highlightedIndex={highlightedIndex} 
              setHighlightedIndex={setHighlightedIndex}
              isSearchZoom={isSearchZoom}
              setIsSearchZoom={setIsSearchZoom} 
              onResultMetadataChange={setLatestResultMetadata}
            />
          </div>

        </Stack__>
      </div>
    </React.Fragment>
  );
}

export default function PlasmicUser(props) {
  return <PlasmicUser__RenderFunc {...props} />;
}
 
