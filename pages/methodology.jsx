import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Methodology from "../components/plasmic/saa_s_website/PlasmicMethodology";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export default function MethodologyPage() {
  return (
    <>
      <Head>
        <title>Methodology</title>
      </Head>

      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Header variant="landing" />
        <main id="main-content" tabIndex={-1}>
          <Methodology />
        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
}