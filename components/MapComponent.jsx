import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";


const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);
  return null;
};

const MapComponent = ({ selectedLayers }) => {
  const [geojsonData, setGeojsonData] = useState(null);

  useEffect(() => {
    fetch("/data/15min.geojson")
      .then((response) => response.json())
      .then((data) => {
        console.log("Loaded GeoJSON:", data);
        setGeojsonData(data);
      })
      .catch((error) => console.error("Failed to load GeoJSON:", error));
  }, []);

  return (
    <div className="mapBox">
      <MapContainer center={[53.558007, 10.007215]} zoom={13} style={{ width: "100%", height: "100vh" }}>
        <MapUpdater />
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 只有当 selectedLayers 里有 'intersection_density' 时才显示 GeoJSON */}
        {geojsonData && selectedLayers.includes("intersection_density") && (
          <GeoJSON data={geojsonData} style={{ color: "blue", weight: 2 }} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
