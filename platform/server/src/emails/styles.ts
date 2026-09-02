import type { CSSProperties } from 'react';

const fontFamily =
  'Inter, sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto"';

export const emailStyles: Record<string, CSSProperties> = {
  main: {
    backgroundColor: '#F5F6F7',
    fontFamily,
    padding: '32px 32px 0px',
  },

  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: '3px',
    padding: '40px',
    margin: '0 auto',
    maxWidth: '656px',
  },

  appLinksContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    margin: '16px 0',
  },

  divider: {
    borderColor: '#e2e8f0',
    margin: '24px 0',
  },

  logoContainer: {
    marginBottom: '40px',
  },

  heading: {
    fontFamily,
    fontWeight: 600,
    fontSize: '25px',
    lineHeight: 1.28,
    color: '#121416',
    margin: '0 0 24px 0',
  },

  paragraph: {
    fontFamily,
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: 1.5,
    letterSpacing: '0.5%',
    color: '#383E42',
    margin: '0 0 24px 0',
  },

  ctaContainer: {
    margin: '24px 0',
  },

  button: {
    backgroundColor: '#0C889D',
    borderRadius: '999px',
    color: '#FFFFFF',
    fontFamily,
    fontWeight: 500,
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '12px 24px',
    border: 'none',
  },

  linkStyle: {
    color: '#0C889D',
    textDecoration: 'underline',
  },

  footer: {
    backgroundColor: 'transparent',
    padding: '32px 40px',
    margin: '0 auto',
    maxWidth: '656px',
  },

  footerText: {
    fontFamily,
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: 1.33,
    letterSpacing: '0.4%',
    color: '#A6AEB4',
    margin: '0 0 12px 0',
  },

  appStoreContainer: {
    margin: '24px 0 0 0',
    textAlign: 'center',
  },

  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    marginRight: '8px',
    border: '1px solid #e2e8f0',
  },

  username: {
    fontFamily,
    fontWeight: 600,
    fontSize: '18px',
    lineHeight: 1.5,
    letterSpacing: '0.5%',
    color: '#383E42',
    margin: 0,
    padding: 0,
  },

  handle: {
    fontFamily,
    fontWeight: 400,
    margin: 0,
    padding: 0,
    marginBottom: '4px',
    fontSize: '14px',
    color: '#6b7280',
  },

  infoContainer: {
    display: 'flex',
    gap: '4px',
    width: '100%',
  },

  messageCard: {
    backgroundColor: '#f3f4f6',
    padding: '8px 8px 4px 8px',
    borderRadius: '8px',
    width: '100%',
    marginBottom: '16px',
  },

  contentContainer: {
    width: '100%',
    marginBottom: '16px',
  },

  profileIcons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginLeft: '20px',
    marginBottom: '6px',
  },
};

export const emailMarkdownCss = `
.email-markdown p,
.email-markdown li {
  font-family: ${fontFamily};
  font-weight: 400;
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: 0.5%;
  color: #383E42;
}
.email-markdown p {
  margin: 0 0 24px 0;
}
.email-markdown a {
  color: #0C889D;
  text-decoration: underline;
}
.email-markdown ul,
.email-markdown ol {
  font-family: ${fontFamily};
  font-size: 16px;
  line-height: 1.5;
  color: #383E42;
  padding-left: 1.5em;
  margin: 0 0 24px 0;
}
`;
