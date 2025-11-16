import * as React from "react"; 
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Stack as Stack__,
  classNames,
  createPlasmicElementProxy,
  useDollarState
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";
import Header from "../../Header";
import "@plasmicapp/react-web/lib/plasmic.css"; 
import projectcss from "./plasmic.module.css";
import sty from "./PlasmicPlanner.module.css";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import Sidebar from "../../Sidebar";
import LayerTagBar from "@/components/LayerTagBar";
import Profile from "../../Profile";

const MapComponent = dynamic(() => import("../../MapComponent"), { ssr: false });

createPlasmicElementProxy;

function PlasmicPlanner__RenderFunc(props) {
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
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [highlightedIndex, setHighlightedIndex] = React.useState(null);
  const [isSearchZoom, setIsSearchZoom] = React.useState(false);

  React.useEffect(() => {
    const city = (typeof window !== "undefined" && (localStorage.getItem("selectedCity") || "hamburg")) || "hamburg";
    fetch(`/data/${city}/layer-list.json`)
      .then((res) => res.json())
      .then(setAvailableLayers)
      .catch((err) => setAvailableLayers([])); 
  }, []);

  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const handleResetResults = () => {
    setComputeAccessibility(false);
    setStartPoints([]);
    setResetTrigger(true);
    setEnabledVariables([]); 
    setLayerValues({}); 
  };

  const onResetHandled = () => {
    setResetTrigger(false);
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
          data-plasmic-override={props.overrides?.root}
          data-plasmic-root
          data-plasmic-for-node={props.forNode}
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
          <Header className={classNames("__wab_instance", sty.header)} />

          <div className={classNames(projectcss.all, sty.mapBox)} id="map">
            <LayerTagBar selectedLayers={selectedLayers} toggleLayer={toggleLayer} />
            <MapComponent
              selectedLayers={selectedLayers}
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
              layerValues={layerValues}
              highlightedIndex={highlightedIndex} 
              setHighlightedIndex={setHighlightedIndex} 
              isSearchZoom={isSearchZoom}
              setIsSearchZoom={setIsSearchZoom}
            />
          </div>

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
            startPoints={startPoints}
            setStartPoints={setStartPoints} 
            setComputeAccessibility={setComputeAccessibility}
            handleResetResults={handleResetResults}
            openCategory={openCategory}
            toggleCategory={toggleCategory}
            showInfo={showInfo}
            setShowInfo={setShowInfo}
            isSearchZoom={isSearchZoom}
            setIsSearchZoom={setIsSearchZoom}
          />
        </Stack__>
      </div>
    </React.Fragment>
  );
}

export default function PlasmicPlanner(props) {
  return <PlasmicPlanner__RenderFunc {...props} />;
}
/* prettier-ignore-end */

