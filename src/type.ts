export type PackageJsonType = {
  dependencies: {
    [x: string]: string;
  };
  devDependencies: {
    [x: string]: string;
  };
  [x: string]: any;
};

export type VersionDifference =
  | "major"
  | "minor"
  | "patch"
  | "none"
  | "invalid";

type PackageInfoItem = {
  currentVersion: string;
  latestVersion: string;
  versionPatchType: VersionDifference;
};

export type PackageInfoType = {
  [x: string]: PackageInfoItem;
};
