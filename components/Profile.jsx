// Profile.jsx
import React, { useState } from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from "next-i18next";

const PROFILE_PRESETS = [
  {
    id: "elderly",
    labelKey: "profile_elderly",
    defaultLabel: "Older adult",
    icon: "/images/profile_elderly.png",
    enabled: [
      "noise",
      "light",
      "tree",
      "slope",
      "unevenSurface",
      "poorPavement",
      "kerbsHigh",
    ],
    values: {
      noise: 0.4,
      light: 0.7,
      tree: 0.7,
      slope: 0.4,
      unevenSurface: 0.4,
      poorPavement: 0.4,
      kerbsHigh: 0.4,
    },
  },
  {
    id: "stroller",
    labelKey: "profile_stroller",
    defaultLabel: "Person with stroller",
    icon: "/images/profile_stroller.png",
    enabled: [
      "noise",
      "light",
      "tree",
      "slope",
      "unevenSurface",
      "poorPavement",
      "kerbsHigh",
    ],
    values: {
      noise: 0.7,
      light: 0.7,
      tree: 0.7,
      slope: 0.4,
      unevenSurface: 0.4,
      poorPavement: 0.4,
      kerbsHigh: 0.4,
    },
  },
  {
    id: "wheelchair",
    labelKey: "profile_wheelchair",
    defaultLabel: "Wheelchair user",
    icon: "/images/profile_wheelchair.png",
    enabled: [
      "noise",
      "light",
      "tree",
      "slope",
      "unevenSurface",
      "poorPavement",
      "kerbsHigh",
    ],
    values: {
      noise: 0.7,
      light: 0.7,
      tree: 0.7,
      slope: 0.4,
      unevenSurface: 0.4,
      poorPavement: 0.4,
      kerbsHigh: 0.1,
    },
  },
];

export default function Profile({ setEnabledVariables, setLayerValues }) {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);

  const applyProfile = (profileId) => {
    // 再次点击同一个 profile：只取消高亮，保持当前值
    if (activeProfile === profileId) {
      setActiveProfile(null);
      return;
    }

    const profile = PROFILE_PRESETS.find((p) => p.id === profileId);
    if (!profile) return;

    setEnabledVariables(profile.enabled);

    setLayerValues((prev) => {
      const next = { ...prev };
      Object.entries(profile.values).forEach(([key, value]) => {
        next[key] = value;
      });
      return next;
    });

    setActiveProfile(profileId);
  };

  const mainLabel = t("profile_main_label", { defaultValue: "Profiles" });

  return (
    <div className={sty.profilePanel}>
      <div className={sty.profileBar}>
        {/* 左侧展开的具体 profile 图标 */}
        {isOpen && (
          <div className={sty.profileOptions}>
            {PROFILE_PRESETS.map((profile) => {
              const label = t(profile.labelKey, {
                defaultValue: profile.defaultLabel,
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
        )}

        {/* 右侧总 profile 图标：控制展开/收起 + 永远有高亮边框 */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={`${sty["profile-main-button"]} ${
            isOpen ? sty["profile-main-button-open"] : ""
          }`}
          aria-pressed={isOpen}
          aria-label={mainLabel}
        >
          <img
            src="/images/profile.png"
            alt=""
            aria-hidden="true"
            className={sty["profile-icon-img"]}
          />
        </button>
      </div>
    </div>
  );
}
