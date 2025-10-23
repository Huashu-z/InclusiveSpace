import * as React from "react"; 
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import GlobalContextsProvider from "../components/plasmic/saa_s_website/PlasmicGlobalContextsProvider";
import PlasmicPlanner from "../components/plasmic/saa_s_website/PlasmicPlanner";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

function Planner() { 
  return (
    <GlobalContextsProvider>
      <PageParamsProvider__
        route={useRouter()?.pathname}
        params={useRouter()?.query}
        query={useRouter()?.query}
      >
        <PlasmicPlanner />
      </PageParamsProvider__>
    </GlobalContextsProvider>
  );
}

export default Planner;

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
