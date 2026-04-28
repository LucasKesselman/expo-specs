# Zappar Integration Notes

## Source of truth

- Primary path: install official Zappar packages if maintained for modern React Native + Expo.
- Fallback path: use Zappar-provided iOS embed artifacts (`ZapparEmbed.include`) via a private artifact source.
- Current repo expects fallback artifact prep through `scripts/prepare-zappar-ios.js`.

## Folder ownership

- `features/zappar/`: bridge, config parsing, and typed launch contracts.
- `components/camera/ZapparCameraEntry.tsx`: camera tab entry flow and launch UX.
- `plugins/withZapparEmbed.js`: iOS Info.plist mutation and embed key injection.
- `scripts/prepare-zappar-ios.js`: deterministic local/CI artifact copy into a gitignored folder.

## Environment variables

- `ZAPPAR_EMBED_KEY`: private embed key (local `.env` + EAS env secret).
- `EXPO_PUBLIC_ZAPPAR_ENABLED`: feature flag (`true` by default, set `false` to disable).
- `EXPO_PUBLIC_ZAPPAR_LAUNCH_DEEP_LINK`: optional deep link passed to the native module.
- `EXPO_PUBLIC_ZAPPAR_BAR_COLOR`: optional launch UI color.
- `ZAPPAR_IOS_EMBED_SOURCE`: absolute/relative path to unpacked `ZapparEmbed.include`.

## Upgrade checklist

1. Verify Zappar native bridge availability in Expo dev client.
2. Confirm iOS prebuild still injects required Info.plist keys.
3. Launch AR from `/(tabs)/camera` and verify return to app.
4. Re-run `npx tsc --noEmit` and `npx expo config --type public`.
