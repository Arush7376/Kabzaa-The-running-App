import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RunScreen from '../screens/RunScreen';
import RunSummaryScreen from '../screens/RunSummaryScreen';
import SignupScreen from '../screens/SignupScreen';
import TerritoryScreen from '../screens/TerritoryScreen';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#63f98d',
    background: '#05070c',
    card: '#05070c',
    text: '#f4f7fb',
    border: '#1c2432',
  },
};

const sharedScreenOptions = {
  animation: 'fade',
  headerBackTitleVisible: false,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: '#05070c',
  },
  headerTintColor: '#63f98d',
  headerTitleStyle: {
    color: '#f4f7fb',
    fontWeight: '800',
  },
  contentStyle: {
    backgroundColor: '#05070c',
  },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      <Stack.Screen component={LoginScreen} name="Login" options={{ title: 'Login' }} />
      <Stack.Screen component={SignupScreen} name="Signup" options={{ title: 'Signup' }} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      <Stack.Screen component={HomeScreen} name="Home" options={{ title: 'KABZAA' }} />
      <Stack.Screen component={RunScreen} name="Run" options={{ headerShown: false }} />
      <Stack.Screen component={RunSummaryScreen} name="RunSummary" options={{ title: 'Run Summary' }} />
      <Stack.Screen component={ProfileScreen} name="Profile" options={{ title: 'Profile' }} />
      <Stack.Screen component={TerritoryScreen} name="Territory" options={{ title: 'Territory' }} />
      <Stack.Screen component={LeaderboardScreen} name="Leaderboard" options={{ title: 'Leaderboard' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { booting, token } = useAuth();

  if (booting) {
    return (
      <View style={styles.bootContainer}>
        <ActivityIndicator color="#63f98d" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070c',
  },
});
