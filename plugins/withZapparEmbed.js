const { createRunOncePlugin, withInfoPlist } = require("expo/config-plugins");

const PLUGIN_NAME = "with-zappar-embed";
const PLUGIN_VERSION = "1.0.0";

function withZapparEmbed(config, props = {}) {
  const embedKey = String(props.embedKey ?? process.env.ZAPPAR_EMBED_KEY ?? "").trim();

  return withInfoPlist(config, (configWithInfoPlist) => {
    const existingInfoPlist = configWithInfoPlist.modResults ?? {};

    configWithInfoPlist.modResults = {
      ...existingInfoPlist,
      NSCameraUsageDescription:
        existingInfoPlist.NSCameraUsageDescription ??
        "This app uses the camera for AR experiences.",
      NSMicrophoneUsageDescription:
        existingInfoPlist.NSMicrophoneUsageDescription ??
        "This app can record audio while capturing AR moments.",
      NSPhotoLibraryUsageDescription:
        existingInfoPlist.NSPhotoLibraryUsageDescription ??
        "This app can access your photo library for AR captures.",
      NSPhotoLibraryAddUsageDescription:
        existingInfoPlist.NSPhotoLibraryAddUsageDescription ??
        "This app can save AR photos and videos to your library.",
      UIViewControllerBasedStatusBarAppearance:
        existingInfoPlist.UIViewControllerBasedStatusBarAppearance ?? false,
      ...(embedKey ? { ZapparEmbedKey: embedKey } : {}),
    };

    return configWithInfoPlist;
  });
}

module.exports = createRunOncePlugin(withZapparEmbed, PLUGIN_NAME, PLUGIN_VERSION);
module.exports.withZapparEmbed = withZapparEmbed;
