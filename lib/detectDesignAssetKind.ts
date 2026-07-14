export type DesignAssetKind = "image" | "video" | "model3d" | "unsupported";

export type Viro3DObjectType = "GLB" | "GLTF" | "OBJ" | "FBX";

export type DesignAssetMeta =
  | {
      kind: "image" | "video";
      extension: string;
    }
  | {
      kind: "model3d";
      extension: string;
      viro3dType: Viro3DObjectType;
    }
  | {
      kind: "unsupported";
      extension: string | null;
    };

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v"]);
const MODEL3D_EXTENSIONS: Record<string, Viro3DObjectType> = {
  ".glb": "GLB",
  ".gltf": "GLTF",
  ".obj": "OBJ",
  ".fbx": "FBX",
};

function extractExtension(uri: string): string | null {
  const withoutQuery = uri.split("?")[0] ?? uri;

  let decodedPath = withoutQuery;
  try {
    decodedPath = decodeURIComponent(withoutQuery);
  } catch {
    decodedPath = withoutQuery;
  }

  const slashIndex = decodedPath.lastIndexOf("/");
  const fileName = slashIndex >= 0 ? decodedPath.slice(slashIndex + 1) : decodedPath;
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return null;
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function detectDesignAssetKind(uri: string): DesignAssetMeta {
  const extension = extractExtension(uri);

  if (!extension) {
    return { kind: "unsupported", extension: null };
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return { kind: "image", extension };
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return { kind: "video", extension };
  }

  const viro3dType = MODEL3D_EXTENSIONS[extension];
  if (viro3dType) {
    return { kind: "model3d", extension, viro3dType };
  }

  return { kind: "unsupported", extension };
}

export function getDesignAssetKindLabel(kind: DesignAssetKind): string {
  switch (kind) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "model3d":
      return "3D model";
    default:
      return "design asset";
  }
}
