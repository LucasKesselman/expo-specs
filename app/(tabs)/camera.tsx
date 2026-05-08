import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ViroCameraScene } from "../../components/camera/ViroCameraScene";

export default function CameraTabScreen() {
  const [sceneInstanceKey, setSceneInstanceKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setSceneInstanceKey((previous) => previous + 1);
    }, []),
  );

  return <ViroCameraScene key={`viro-camera-${sceneInstanceKey}`} />;
}
