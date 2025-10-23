import * as React from "react"; 
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host"; 
import PlasmicUser from "../components/plasmic/saa_s_website/PlasmicUser";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

function User() { 
  return (
    <PageParamsProvider__
      route={useRouter()?.pathname}
      params={useRouter()?.query}
      query={useRouter()?.query}
    >
      <PlasmicUser />
    </PageParamsProvider__>
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