/**
 * Main Application entry point.
 */
import React from 'react';
import 'react-native-gesture-handler';
import Navigation from './src/Navigation';
import { StatusBar } from 'react-native';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#ec4899" />
      <Navigation />
    </>
  );
}
