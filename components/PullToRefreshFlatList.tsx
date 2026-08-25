import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  type FlatListProps,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

const SPINNER_SHOW_PX = 24;
const REFRESH_THRESHOLD_PX = 56;
const MAX_PULL_PX = 80;
const PULL_DAMPING = 0.4;
const REFRESHING_REST_PX = 36;

export type PullToRefreshFlatListProps<ItemT> = Omit<FlatListProps<ItemT>, "refreshControl"> & {
  refreshing: boolean;
  onRefresh: () => void;
  progressViewOffset?: number;
};

export function PullToRefreshFlatList<ItemT>({
  refreshing,
  onRefresh,
  progressViewOffset = 0,
  onScroll,
  style,
  ...listProps
}: PullToRefreshFlatListProps<ItemT>) {
  if (Platform.OS !== "web") {
    return (
      <FlatList
        {...listProps}
        style={style}
        onScroll={onScroll}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#93C5FD"
            colors={["#93C5FD"]}
            progressBackgroundColor="#111827"
            progressViewOffset={progressViewOffset}
          />
        }
      />
    );
  }

  return (
    <WebPullToRefreshFlatList
      {...listProps}
      style={style}
      onScroll={onScroll}
      refreshing={refreshing}
      onRefresh={onRefresh}
      progressViewOffset={progressViewOffset}
    />
  );
}

function WebPullToRefreshFlatList<ItemT>({
  refreshing,
  onRefresh,
  progressViewOffset = 0,
  onScroll,
  style,
  ...listProps
}: PullToRefreshFlatListProps<ItemT>) {
  const webRootRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const pullPxRef = useRef(0);
  const pullingRef = useRef(false);
  const showSpinnerRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startPageYRef = useRef(0);
  const refreshingRef = useRef(refreshing);
  const onRefreshRef = useRef(onRefresh);
  const pullAnim = useRef(new Animated.Value(0)).current;
  const [showSpinner, setShowSpinner] = useState(false);

  refreshingRef.current = refreshing;
  onRefreshRef.current = onRefresh;

  const setSpinnerVisible = useCallback((visible: boolean) => {
    if (showSpinnerRef.current === visible) {
      return;
    }
    showSpinnerRef.current = visible;
    setShowSpinner(visible);
  }, []);

  const applyPull = useCallback(
    (px: number) => {
      pullPxRef.current = px;
      pullAnim.setValue(px);
      if (px >= SPINNER_SHOW_PX || refreshingRef.current) {
        setSpinnerVisible(true);
      }
    },
    [pullAnim, setSpinnerVisible],
  );

  const animatePullTo = useCallback(
    (px: number, onFinished?: () => void) => {
      pullPxRef.current = px;
      Animated.timing(pullAnim, {
        toValue: px,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onFinished?.();
        }
      });
    },
    [pullAnim],
  );

  const finishPull = useCallback(() => {
    if (!pullingRef.current) {
      return;
    }
    pullingRef.current = false;
    const distance = pullPxRef.current;
    if (distance >= REFRESH_THRESHOLD_PX && !refreshingRef.current) {
      setSpinnerVisible(true);
      animatePullTo(REFRESHING_REST_PX);
      onRefreshRef.current();
      return;
    }
    if (!refreshingRef.current) {
      animatePullTo(0, () => setSpinnerVisible(false));
    }
  }, [animatePullTo, setSpinnerVisible]);

  useEffect(() => {
    if (refreshing) {
      setSpinnerVisible(true);
      animatePullTo(REFRESHING_REST_PX);
      return;
    }
    animatePullTo(0, () => setSpinnerVisible(false));
  }, [animatePullTo, refreshing, setSpinnerVisible]);

  useEffect(() => {
    const host = webRootRef.current as unknown as HTMLElement | null;
    if (!host || typeof host.addEventListener !== "function") {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (refreshingRef.current) {
        return;
      }
      if (scrollYRef.current > 0) {
        pointerIdRef.current = null;
        return;
      }
      pointerIdRef.current = event.pointerId;
      startPageYRef.current = event.pageY;
      pullingRef.current = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }
      if (refreshingRef.current) {
        return;
      }
      const dy = event.pageY - startPageYRef.current;
      if (scrollYRef.current > 0 && !pullingRef.current) {
        return;
      }
      if (dy <= 0) {
        if (pullingRef.current) {
          applyPull(0);
        }
        pullingRef.current = false;
        return;
      }
      pullingRef.current = true;
      event.preventDefault();
      applyPull(Math.min(dy * PULL_DAMPING, MAX_PULL_PX));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }
      pointerIdRef.current = null;
      finishPull();
    };

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove, { passive: false });
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);

    return () => {
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
    };
  }, [applyPull, finishPull]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  return (
    <View ref={webRootRef} collapsable={false} style={styles.webRoot}>
      {showSpinner ? (
        <View
          pointerEvents="none"
          style={[styles.webSpinner, { top: progressViewOffset }]}
        >
          <ActivityIndicator size="small" color="#93C5FD" />
        </View>
      ) : null}
      <Animated.View style={[styles.webListShift, { transform: [{ translateY: pullAnim }] }]}>
        <FlatList
          {...listProps}
          style={[style, webOverscrollStyle]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          alwaysBounceVertical
        />
      </Animated.View>
    </View>
  );
}

const webOverscrollStyle = {
  overscrollBehavior: "contain",
} as const;

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    overflow: "hidden",
  },
  webListShift: {
    flex: 1,
  },
  webSpinner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
