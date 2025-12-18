import * as React from "react";
import Head from "next/head";
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import PlasmicUser from "../components/plasmic/saa_s_website/PlasmicUser";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

function User() {
  const { t } = useTranslation("common");

  return (
    <>
      <Head>
        <title>{t("page_title_map")}</title>
      </Head>

      <main id="main-content" tabIndex={-1}>
        <PageParamsProvider__
          route={useRouter()?.pathname}
          params={useRouter()?.query}
          query={useRouter()?.query}
        >
          <PlasmicUser />
        </PageParamsProvider__>
      </main>
    </>
  );
}

export default User;

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ["common"])) } };
}
