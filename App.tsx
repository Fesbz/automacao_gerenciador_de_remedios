import React from 'react';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    primary: '#D81B3D',
    onPrimary: '#FFFFFF',

    secondary: '#E98DB8',
    onSecondary: '#FFFFFF',

    background: '#F8F3F4',
    surface: '#FFFFFF',

    surfaceVariant: '#F3E4E8',
    onSurfaceVariant: '#6F5D63',

    error: '#BA1A1A',
    onError: '#FFFFFF',

    outline: '#D8C5CB',
  },
};

function App() {
  return (
    <PaperProvider theme={theme}>
      <AppNavigator />
    </PaperProvider>
  );
}

export default App;