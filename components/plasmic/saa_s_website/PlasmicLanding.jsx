import React, { useState } from "react";
import { useRouter } from "next/router";
import PlasmicHeader from "./PlasmicHeader";
import sty from "./PlasmicLanding.module.css";

export default function PlasmicLanding() {
  const router = useRouter();

  const cities = [
    { id: "hamburg", name: "Hamburg", logo: "/plasmic/saa_s_website/images/hamburg_logo.png", center: [53.5503, 9.9920] },
    { id: "aachen", name: "Aachen", logo: "/plasmic/saa_s_website/images/aachen_logo.png", center: [50.7753, 6.0839] },
    { id: "penteli", name: "Penteli", logo: "/plasmic/saa_s_website/images/penteli_logo.png", center: [38.0491, 23.8653] },
  ];

  const [selectedCity, setSelectedCity] = useState("hamburg");

  const handleEnterMap = () => {
    const selected = cities.find(c => c.id === selectedCity);
    if (!selected) return;

    // temporary, other cities not yet finished
    if (selected.id !== "hamburg") {
        alert(`Sorry, ${selected.name} map is still under construction.`);
        return;
    }

    localStorage.setItem("selectedCity", selectedCity);
    localStorage.setItem("selectedCityCenter", JSON.stringify(selected.center));

    router.push({
        pathname: "/user",
        query: { city: selectedCity }
    });
    };

  return (
    <div className={sty.container}>
      <PlasmicHeader />

      {/* 顶部大图 */}
      <img
        src="/plasmic/saa_s_website/images/landingpage.png"
        alt="Landing Header"
        className={sty.headerImage}
      />

      <main className={sty.content}>
        {/* 城市选择 */}
        <div className={sty.cityRow}>
          {cities.map((city) => (
            <div key={city.id} style={{ textAlign: "center" }}>
              <div
                className={`${sty.cityCard} ${
                  selectedCity === city.id ? sty.cityCardActive : ""
                }`}
                onClick={() => setSelectedCity(city.id)}
              >
                <img
                  src={city.logo}
                  alt={city.name}
                  className={sty.cityLogo}
                />
              </div>
              <div className={sty.cityName}>{city.name}</div>
            </div>
          ))}
        </div>

        {/* 按钮 */}
        <button onClick={handleEnterMap} className={sty.bigButton}>
          Enter Map
        </button>
      </main>
    </div>
  );
}
