import { Button, ButtonText } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Text } from "react-native";

/** Props for the Google sign-in placeholder modal (WIP). */
type SignInWithGoogleModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Modal shown when the user taps "Sign in with Google" on the login screen.
 * Currently shows setup instructions; full Google OAuth flow is not implemented.
 */
export function SignInWithGoogleModal({ isOpen, onClose }: SignInWithGoogleModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            Sign In with Google is a work in progress
          </Text>
          <ModalCloseButton onPress={onClose} />
        </ModalHeader>
        <ModalBody>
          <Text style={{ fontSize: 14, color: "#475569", lineHeight: 22, marginBottom: 16 }}>
            To add Sign in with Google later:
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 20, marginBottom: 8 }}>
            1. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env. Get it from Google Cloud Console
            → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application).
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 20, marginBottom: 8 }}>
            2. Add your app’s redirect URI to that client. Use Linking.createURL("auth") in your
            app to see the redirect (e.g. exp://... or https://auth.expo.io/...).
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 20, marginBottom: 8 }}>
            3. Option A (Expo Go): In app/user-auth-page.tsx, restore the
            WebBrowser.openAuthSessionAsync flow: build the Google auth URL with client_id and
            redirect_uri, open it, parse the returned URL for #id_token=..., then call
            signInWithGoogle(idToken) from useAuth.
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 20, marginBottom: 8 }}>
            4. Option B (development build): Install @react-native-google-signin/google-signin,
            configure it in app.json, then get the id token and pass it to
            signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>
            <ButtonText>Close</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
