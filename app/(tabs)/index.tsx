import { Redirect, type Href } from "expo-router";

export default function TabsIndex() {
  return <Redirect href={"/(tabs)/marketplace" as Href} />;
}
