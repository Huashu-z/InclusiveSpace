import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    // Next.js 会在 ctx 里提供 locale（启用 i18n 路由时）
    return { ...initialProps, locale: ctx.locale || "en" };
  }

  render() {
    const lang = this.props.locale || "en";
    return (
      <Html lang={lang}>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
