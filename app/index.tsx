import { Redirect, type Href } from "expo-router";

/** Root index: redirects to auth landing page. */
export default function Index() {
  return <Redirect href={"/(auth)/landing-page" as Href} />;
}
