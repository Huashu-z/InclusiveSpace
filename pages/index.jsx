import * as React from "react"; 
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import GlobalContextsProvider from "../components/plasmic/saa_s_website/PlasmicGlobalContextsProvider";
import PlasmicLanding from "../components/plasmic/saa_s_website/PlasmicLanding";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

function User() { 
  return (
    <GlobalContextsProvider>
      <PageParamsProvider__
        route={useRouter()?.pathname}
        params={useRouter()?.query}
        query={useRouter()?.query}
      >
        <PlasmicLanding />
      </PageParamsProvider__>
    </GlobalContextsProvider>
  );
}

export default User;

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}