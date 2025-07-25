// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */
// This class is auto-generated by Plasmic; please do not edit!
// Plasmic Project: uftrV6ZeR5SuVi5gnDLzFk
// Component: fDzUbLUclsbT
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  PlasmicImg as PlasmicImg__,
  PlasmicLink as PlasmicLink__,
  Stack as Stack__,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  ensureGlobalVariants
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";
import { useScreenVariants as useScreenVariantsxtsyYlb80OMw } from "./PlasmicGlobalVariant__Screen"; // plasmic-import: xtsyYlb80oMw/globalVariant
import "@plasmicapp/react-web/lib/plasmic.css";
import plasmic_antd_5_hostless_css from "../antd_5_hostless/plasmic.module.css"; // plasmic-import: ohDidvG9XsCeFumugENU3J/projectcss
import projectcss from "./plasmic.module.css"; // plasmic-import: uftrV6ZeR5SuVi5gnDLzFk/projectcss
import sty from "./PlasmicHeader.module.css"; // plasmic-import: fDzUbLUclsbT/css
import IconIcon from "./icons/PlasmicIcon__Icon"; // plasmic-import: YGMYbVzkkBki/icon
import { useTranslation } from "next-i18next";

createPlasmicElementProxy;

export const PlasmicHeader__VariantProps = new Array();

export const PlasmicHeader__ArgProps = new Array();

const $$ = {};

function useNextRouter() {
  try {
    return useRouter();
  } catch {}
  return undefined;
}

function PlasmicHeader__RenderFunc(props) {
  const { t } = useTranslation("common");
  const { variants, overrides, forNode } = props;
  const args = React.useMemo(
    () =>
      Object.assign(
        {},
        Object.fromEntries(
          Object.entries(props.args).filter(([_, v]) => v !== undefined)
        )
      ),
    [props.args]
  );
  const $props = {
    ...args,
    ...variants
  };
  const __nextRouter = useNextRouter();
  const currentPath = __nextRouter?.pathname || "/"; // Current path
  const $ctx = useDataEnv?.() || {};
  const refsRef = React.useRef({});
  const $refs = refsRef.current;
  const globalVariants = ensureGlobalVariants({
    screen: useScreenVariantsxtsyYlb80OMw()
  });
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <div
      data-plasmic-name={"root"}
      data-plasmic-override={overrides.root}
      data-plasmic-root={true}
      data-plasmic-for-node={forNode}
      className={classNames(
        projectcss.all,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        plasmic_antd_5_hostless_css.plasmic_tokens,
        sty.root
      )}
    >
      <div className={classNames(projectcss.all, sty.freeBox__jTTA)}>
        <Stack__
          as={"div"}
          hasGap={true}
          className={classNames(projectcss.all, sty.freeBox___8G5F)}
        >
          <Stack__ as={"div"} className={sty["header-container"]} hasGap={true}>
            
            {/* Left side: Logo */}
            <Stack__ as={"div"} className={sty["logo-container"]}>
              <Link href={`/`}>
                <div className={sty["logo-wrapper"]}>
                  <img src="/plasmic/saa_s_website/images/logo_co-founded-eu.png" alt="EU Logo" />
                </div>
              </Link>
              <Link href={`/`}>
                <div className={sty["logo-wrapper"]}>
                  <img src="/plasmic/saa_s_website/images/logoIS.png" alt="IS Logo" />
                </div>
              </Link>
              <Link href={`/`}>
                <div className={sty["logo-wrapper"]}>
                  <img src="/plasmic/saa_s_website/images/tum_logo.png" alt="TUM Logo" />
                </div>
              </Link>
            </Stack__>

            {/* Right side: User & Planner button */}
            <Stack__ as={"div"} className={sty["link-container-wrapper"]} hasGap={true}>
              <span className={sty["lang-switch-wrap"]}>
                {["de", "en"].map((lng, idx) => ( 
                  <React.Fragment key={lng}> 
                    <Link 
                      href={{ pathname: __nextRouter?.pathname || "/", query: __nextRouter?.query }} 
                      as={__nextRouter?.asPath} 
                      locale={lng} 
                      className={ 
                        lng === __nextRouter?.locale ? sty["lang-active"] : undefined 
                      } 
                    > 
                      {lng} 
                    </Link> 
                    {idx < 1 && " | "} 
                  </React.Fragment> 
                ))} 
              </span>
              <button
                onClick={() => setShowHelp(true)}
                className={sty["help-button"]}
                title={t('header_tool_instruction')}
              >
                ?
              </button>
              <Stack__
                as={Link}
                href={`/`}
                className={`${sty["link__container"]} ${currentPath === "/" ? sty["active"] : ""}`}
              >
                <div>{t('header_user')}</div>
              </Stack__>

              <Stack__
                as={Link}
                href={`/planner`}
                className={`${sty["link__container"]} ${currentPath === "/planner" ? sty["active"] : ""}`}
              >
                <div>{t('header_planner')}</div>
              </Stack__>
            </Stack__>

          </Stack__>
        </Stack__>
      </div>
      {showHelp && (
        <div className={sty["modal-overlay"]} onClick={() => setShowHelp(false)}>
          <div className={sty["modal-content"]} onClick={(e) => e.stopPropagation()}>
            <h2>{t('modal_help_title')}</h2>

            <p className={sty["section-intro"]}>
              {t('modal_help_intro')}
            </p>

            <hr className={sty["modal-divider"]} />

            <div className={sty["section"]}>
              <h3>How to use it:</h3>
              <ul>
                <li>{t('modal_howto_step_select_start')}</li>
                <li>{t('modal_howto_step_adjust')}</li>
                <li>{t('modal_howto_step_enable_features')}</li>
                <li>{t('modal_howto_step_get_area')}</li>
                <li>{t('modal_howto_step_view_results')}</li>
              </ul>
            </div>

            <hr className={sty["modal-divider"]} />

            <div className={sty["section"]}>
              <h3>{t('modal_tips_title')}</h3>
              <ul>
                <li>{t('modal_tips_step_toggle_layers')}</li>
                <li>{t('modal_tips_step_adjust_weights')}</li>
                <li>{t('modal_tips_step_reset')}</li>
              </ul>
            </div>

            <hr className={sty["modal-divider"]} />

            <p className={sty["section-outro"]}>
              {t('modal_outro')}
            </p>

            <button onClick={() => setShowHelp(false)} className={sty["modal-close"]}>
              {t('modal_close')}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

const PlasmicDescendants = {
  root: ["root", "img"],
  img: ["img"]
};

function makeNodeComponent(nodeName) {
  const func = function (props) {
    const { variants, args, overrides } = React.useMemo(
      () =>
        deriveRenderOpts(props, {
          name: nodeName,
          descendantNames: PlasmicDescendants[nodeName],
          internalArgPropNames: PlasmicHeader__ArgProps,
          internalVariantPropNames: PlasmicHeader__VariantProps
        }),
      [props, nodeName]
    );
    return PlasmicHeader__RenderFunc({
      variants,
      args,
      overrides,
      forNode: nodeName
    });
  };
  if (nodeName === "root") {
    func.displayName = "PlasmicHeader";
  } else {
    func.displayName = `PlasmicHeader.${nodeName}`;
  }
  return func;
}

export const PlasmicHeader = Object.assign(
  // Top-level PlasmicHeader renders the root element
  makeNodeComponent("root"),
  {
    // Helper components rendering sub-elements
    img: makeNodeComponent("img"),
    // Metadata about props expected for PlasmicHeader
    internalVariantProps: PlasmicHeader__VariantProps,
    internalArgProps: PlasmicHeader__ArgProps
  }
);

export default PlasmicHeader;
/* prettier-ignore-end */
