import * as React from "react";
import Head from "next/head";
import { PageParamsProvider as PageParamsProvider__ } from "@plasmicapp/react-web/lib/host";
import PlasmicLanding from "../components/plasmic/saa_s_website/PlasmicLanding";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

function IndexPage() {
  const { t } = useTranslation("common");

  return (
    <>
      <Head>
        <title>{t("page_title_landing")}</title>
      </Head>

      <main id="main-content" tabIndex={-1}>
        <PageParamsProvider__
          route={useRouter()?.pathname}
          params={useRouter()?.query}
          query={useRouter()?.query}
        >
          <PlasmicLanding />
        </PageParamsProvider__>
      </main>
    </>
  );
}

export default IndexPage;

export async function getStaticProps({ locale }) {
  return { props: { ...(await serverSideTranslations(locale, ["common"])) } };
}
