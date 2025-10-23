import * as React from "react"; 
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host"; 
import PlasmicPlanner from "../components/plasmic/saa_s_website/PlasmicPlanner";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

function Planner() { 
  return (
    <PageParamsProvider__
      route={useRouter()?.pathname}
      params={useRouter()?.query}
      query={useRouter()?.query}
    >
      <PlasmicPlanner />
    </PageParamsProvider__>
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
