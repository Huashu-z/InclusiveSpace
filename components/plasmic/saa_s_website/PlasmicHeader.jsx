import * as React from "react"; 
import sty from "./PlasmicHeader.module.css";

function PlasmicHeader__RenderFunc(props) {
  const { left, center, right, className = "", navAriaLabel } = props;

  return (
    <header
      className={[sty["header-container"], className].join(" ")}
      role="banner"
    >
      <div className={sty["logo-container"]}>{left}</div>
      <div className={sty["center-logo"]}>{center}</div>

      <nav
        className={sty["link-container-wrapper"]}
        aria-label={navAriaLabel || "Main navigation"}
      >
        {right}
      </nav>
    </header>
  );
}

const PlasmicHeader = PlasmicHeader__RenderFunc;
export default PlasmicHeader; 