import { Button, ButtonText } from "@/components/ui/button";
import { useAuthState } from "@/hooks/useAuth";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Motion } from "@legendapp/motion";
import { useRouter, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Animated, Text, View } from "react-native";

const EMOJIS = ["👕", "🎨", "✏️", "👔"];
const BOUNCE_WAIT_MS = 2000; // pause at bottom before next cycle
const BOUNCE_CYCLE_MS = 700 + BOUNCE_WAIT_MS; // up + down + wait
const BOUNCE_STAGGER_MS = Math.floor(BOUNCE_CYCLE_MS / 8);
const BOUNCE_UP_MS = 350;
const BOUNCE_DOWN_MS = 350;
const BOUNCE_DISTANCE = 10;

/** Landing screen: entry to login or bypass to tabs. */
export default function LandingPage() {
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthState();
  const hasShownAlert = useRef(false);
  const bounceYs = useRef(EMOJIS.map(() => new Animated.Value(0))).current;
  const cancelled = useRef(false);

  useEffect(() => {
    if (!user || hasShownAlert.current) return;
    hasShownAlert.current = true;
    Alert.alert("Already logged in", "You are already logged in.", [
      { text: "OK", onPress: () => router.replace("/(tabs)/account" as Href) },
    ]);
  }, [user, router]);

  useEffect(() => {
    cancelled.current = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const runCycle = (bounceY: Animated.Value) => {
      if (cancelled.current) return;
      Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -BOUNCE_DISTANCE,
          useNativeDriver: true,
          duration: BOUNCE_UP_MS,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          useNativeDriver: true,
          duration: BOUNCE_DOWN_MS,
        }),
      ]).start(({ finished }) => {
        if (finished && !cancelled.current) {
          const id = setTimeout(() => runCycle(bounceY), BOUNCE_WAIT_MS);
          timeouts.push(id);
        }
      });
    };

    EMOJIS.forEach((_, index) => {
      const delay = index * BOUNCE_STAGGER_MS;
      const start = () => runCycle(bounceYs[index]);
      if (delay === 0) start();
      else timeouts.push(setTimeout(start, delay));
    });

    return () => {
      cancelled.current = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background0,
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Hero: ArtieApparel + bouncing emojis */}
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text
              style={{
                fontSize: 42,
                fontWeight: "800",
                color: "#e53935",
                letterSpacing: -0.5,
              }}
            >
              Art
            </Text>
            <Text
              style={{
                fontSize: 42,
                fontWeight: "800",
                color: colors.typography950,
                letterSpacing: -0.5,
              }}
            >
              ieApparel
            </Text>
          </View>
          <Text
            style={{
              fontSize: 16,
              color: colors.typography500,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Design tees. Wear your style.
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 24,
            }}
          >
            {EMOJIS.map((emoji, index) => (
              <Motion.View
                key={emoji}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "timing",
                  duration: 400,
                  delay: index * 80,
                  opacity: { type: "timing", duration: 400, delay: index * 80 },
                  scale: {
                    type: "spring",
                    damping: 14,
                    stiffness: 180,
                    delay: index * 80,
                  },
                }}
                style={{ alignItems: "center", justifyContent: "center" }}
              >
                <Animated.View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.secondary100,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ translateY: bounceYs[index] }],
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Animated.View>
              </Motion.View>
            ))}
          </View>
        </View>

        {/* CTA buttons – Gluestack Button */}
        <View style={{ width: "100%", maxWidth: 280, gap: 12 }}>
          <Button
            size="lg"
            onPress={() => router.push("/(auth)/login" as Href)}
            style={{ width: "100%" }}
          >
            <ButtonText>Navigate to Login</ButtonText>
          </Button>
          <Button
            variant="outline"
            action="secondary"
            size="lg"
            onPress={() => router.replace("/(tabs)" as Href)}
            style={{ width: "100%" }}
          >
            <ButtonText>Bypass to Homepage</ButtonText>
          </Button>
        </View>
      </View>
    </View>
  );
}
