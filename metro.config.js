const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Force @firebase/auth to use the React Native build (has getReactNativePersistence).
// The default resolution can pick the browser build when using the firebase package.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/auth' || moduleName.startsWith('@firebase/auth/')) {
    return context.resolveRequest(
      {
        ...context,
        unstable_conditionNames: ['react-native', 'require'],
      },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
