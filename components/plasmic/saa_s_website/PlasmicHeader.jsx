import * as React from "react"; 
import sty from "./PlasmicHeader.module.css";

function PlasmicHeader__RenderFunc(props) {
  const { left, center, right, className = "" } = props;
  return (
    <div className={[sty["header-container"], className].join(" ")}>
      <div className={sty["logo-container"]}>{left}</div>
      <div className={sty["center-logo"]}>{center}</div>
      <div className={sty["link-container-wrapper"]}>{right}</div>
    </div>
  );
}

const PlasmicHeader = PlasmicHeader__RenderFunc;
export default PlasmicHeader; 