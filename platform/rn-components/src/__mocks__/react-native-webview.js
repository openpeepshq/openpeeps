const React = require('react');
const { View } = require('react-native');

/** Minimal mock of react-native-webview.WebView for jest tests. */
class WebView extends React.Component {
  render() {
    return React.createElement(View, { testID: 'webview-mock' });
  }
}

WebView.navigation = {
  whitelist: [],
  blacklist: [],
};

module.exports = {
  WebView,
  WebViewNavigation: {},
  WebViewRenderer: {},
};
