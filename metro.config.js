const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prefer React Native build of @firebase/auth on native (iOS/Android) so
// getReactNativePersistence works. On web, use the default (browser) build.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform !== 'web' &&
    (moduleName === '@firebase/auth' || moduleName.startsWith('@firebase/auth/'))
  ) {
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
