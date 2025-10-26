import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        
        {/* Mobile Web App Capabilities */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Oakline Bank" />
        
        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Banking Theme Colors */}
        <meta name="theme-color" content="#1e3a8a" />
        <meta name="msapplication-navbutton-color" content="#1e3a8a" />
        <meta name="apple-mobile-web-app-status-bar-style" content="#1e3a8a" />
        
        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        
        {/* Banking Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Banking SEO */}
        <meta name="description" content="Oakline Bank - Modern banking solutions with mobile-first design. Open your account in minutes with our secure, convenient digital banking platform." />
        <meta name="keywords" content="mobile banking, digital bank, online banking, checking account, savings account, loans, iPhone banking app" />
        
        {/* Mobile-friendly styling */}
        <style>{`
          /* Prevent zoom on form inputs in iOS */
          @media screen and (-webkit-min-device-pixel-ratio:0) {
            input, select, textarea {
              font-size: 16px !important;
            }
          }
          
          /* Remove iOS input shadows */
          input, textarea {
            -webkit-appearance: none;
            border-radius: 0;
          }
          
          /* Improve button appearance on iOS */
          button {
            -webkit-appearance: none;
            border-radius: 0;
          }
          
          /* Prevent iOS from auto-styling phone numbers */
          a[href^="tel:"] {
            color: inherit;
            text-decoration: none;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}