import { Button, ButtonText } from "@/components/ui/button";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { type Href, useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { Alert, ScrollView, Text, View } from "react-native";

function formatAuthTime(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

function getProviderLabel(providerId: string): string {
  if (providerId === "password") return "Email / Password";
  if (providerId === "google.com") return "Google";
  if (providerId === "apple.com") return "Apple";
  return providerId;
}

function SessionInfo({ user }: { user: User }) {
  const { metadata, providerData } = user;
  const provider = providerData?.[0];
  const providerName = provider ? getProviderLabel(provider.providerId) : "—";

  return (
    <View
      style={{
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 24,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Session info
      </Text>
      <View style={{ gap: 10 }}>
        <InfoRow label="Email" value={user.email ?? "—"} />
        <InfoRow label="Display name" value={user.displayName ?? "—"} />
        <InfoRow label="User ID" value={user.uid} />
        <InfoRow label="Signed in with" value={providerName} />
        <InfoRow label="Last sign-in" value={formatAuthTime(metadata?.lastSignInTime)} />
        <InfoRow label="Account created" value={formatAuthTime(metadata?.creationTime)} />
        <InfoRow
          label="Email verified"
          value={user.emailVerified ? "Yes" : "No"}
        />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          color: "#64748b",
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 15,
          color: "#0f172a",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function AccountTab() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useAuthState();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/landing-page" as Href);
      Alert.alert("You've been logged out");
    } catch {
      // error surfaced in useAuth if needed
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: "#0f172a",
            marginHorizontal: 20,
            marginBottom: 20,
          }}
        >
          Account
        </Text>
        {user ? (
          <SessionInfo user={user} />
        ) : (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 24,
              padding: 16,
              backgroundColor: "#fef3c7",
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 15, color: "#92400e" }}>
              Not signed in. Use the landing or login flow to sign in.
            </Text>
          </View>
        )}
        <View
          style={{
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Button variant="outline" action="secondary" onPress={handleLogout}>
            <ButtonText>Logout</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
