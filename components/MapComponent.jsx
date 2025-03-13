import { useEffect } from "react";  // ✅ 这里导入 useEffect
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// 触发地图重绘
const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);
  return null;
};

const MapComponent = () => {
    return (
      <div className="mapBox">
        <MapContainer
          center={[48.1351, 11.582]}
          zoom={13}
          style={{ width: "100%", height: "100vh" }} 
        >
          <MapUpdater /> 
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    );
};
  
export default MapComponent;
