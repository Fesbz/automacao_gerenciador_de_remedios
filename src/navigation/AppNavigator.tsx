import React from 'react';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import MedicinesScreen from '../screens/MedicinesScreen';
import AddMedicineScreen from '../screens/AddMedicineScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Início"
        screenOptions={{
          headerShown: false,

          tabBarActiveTintColor: '#5DA9E9',
          tabBarInactiveTintColor: '#7B8794',

          tabBarStyle: {
            height: 64,
            paddingTop: 7,
            paddingBottom: 8,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E1E7ED',
          },

          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>

        <Tab.Screen
          name="Início"
          component={HomeScreen}
        />

        <Tab.Screen
          name="Medicamentos"
          component={MedicinesScreen}
        />

        <Tab.Screen
          name="Adicionar"
          component={AddMedicineScreen}
        />

        <Tab.Screen
          name="Histórico"
          component={HistoryScreen}
        />

      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;