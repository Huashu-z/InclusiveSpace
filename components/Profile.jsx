import React, { useState } from "react"; 
import sty from "./Sidebar.module.css";
import { useTranslation } from "next-i18next";
import { getProfilePresetList } from "./agent/profilePresets.js";

export default function Profile({
  setEnabledVariables,
  setLayerValues,
  setWalkingSpeed,
  setWalkingTime,
  setUserProfile
}) {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const profilePresets = getProfilePresetList();

  const applyProfile = (profileId) => { 
    if (activeProfile === profileId) {
      setActiveProfile(null);
      setUserProfile?.(null);
      return;
    }

    const profile = profilePresets.find((p) => p.id === profileId);
    if (!profile) return;

    setEnabledVariables(profile.enabledVariables);

    setLayerValues((prev) => {
      const next = { ...prev };
      Object.entries(profile.layerValues).forEach(([key, value]) => {
        next[key] = value;
      });
      return next;
    });

    if (setWalkingSpeed && typeof profile.walkingSpeed === "number") {
      setWalkingSpeed(profile.walkingSpeed);
    }

    if (setWalkingTime && typeof profile.walkingTime === "number") {
      setWalkingTime(profile.walkingTime);
    }

    setUserProfile?.({
      id: profile.aliases?.[0] || profile.id,
      presetId: profile.id,
      label: t(profile.labelKey, { defaultValue: profile.label }),
      walkingSpeed: profile.walkingSpeed,
      walkingTime: profile.walkingTime,
      enabledVariables: profile.enabledVariables,
      layerValues: profile.layerValues
    });
    setActiveProfile(profileId);
  };

  const titleText = t("profile_title");

  return (
    <section
      id="profile"
      tabIndex={-1}
      className={sty.profilePanel}
      aria-label={titleText}
    >
      {/* Collapsed state */}
      {!isOpen && (
        <button
          type="button"
          className={sty.profileMainBox}
          onClick={() => setIsOpen(true)}
          aria-label={titleText}
          aria-expanded={isOpen}
        >
          <span className={sty.profileMainTitle}>{titleText}</span>
          <span className={sty.profileMainIconWrapper}>
            <img
              src="/images/profile.png"
              alt=""
              aria-hidden="true"
              className={sty.profileMainIcon}
            />
          </span>
        </button>
      )}

      {/* Expanded state */}
      {isOpen && (
        <div className={sty.profileBarExpanded}>
          <div
            className={sty.profileOptions}
            role="list"
            aria-label={t("profile_title")}
          >
            {profilePresets.map((profile) => {
              const label = t(profile.labelKey, {
                defaultValue: profile.label
              });
              const isActive = activeProfile === profile.id;

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => applyProfile(profile.id)}
                  className={`${sty["profile-icon-button"]} ${
                    isActive ? sty["profile-icon-button-active"] : ""
                  }`}
                  aria-pressed={isActive}
                  aria-label={label}
                >
                  <img
                    src={profile.icon}
                    alt=""
                    aria-hidden="true"
                    className={sty["profile-icon-img"]}
                  />
                  <span className={sty["profile-icon-label"]}>{label}</span>
                </button>
              );
            })}
          </div> 
          {/* main profile */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={sty.profileMainIconOnlyButton}
            aria-label={t("profile_collapse")}
            title={t("profile_collapse")}
          >
            <img
              src="/images/profile.png"
              alt=""
              aria-hidden="true"
              className={sty.profileMainIcon}
            />
          </button>
        </div>
      )}
    </section>
  );
} 
