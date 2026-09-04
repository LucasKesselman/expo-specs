import { type Href, router } from "expo-router";

/**
 * Leave the nested (auth) group by popping it off the root stack.
 * `replace` to a tab from inside (auth) leaves a second (tabs) navigator
 * underneath and breaks the header back button for the rest of the session.
 */
export function exitAuthTo(href: Href) {
  if (router.canDismiss()) {
    router.dismissTo(href);
    return;
  }

  router.navigate(href);
}
