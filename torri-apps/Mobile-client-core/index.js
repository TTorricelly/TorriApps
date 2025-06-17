/**
 * @format
 */
import 'react-native-gesture-handler';
import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Suppress the defaultProps warnings from react-native-render-html
// This is a known issue with React 18 compatibility
LogBox.ignoreLogs([
  'Support for defaultProps will be removed from function components',
  'Support for defaultProps will be removed from memo components'
]);

AppRegistry.registerComponent(appName, () => App);
