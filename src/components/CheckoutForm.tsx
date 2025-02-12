import { useAuth, useAuthToken } from "@/hooks/useAuth";
import { routes } from "../firebaseConfig";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@mui/material";
import { JSX } from "react";

interface CheckoutFormProps {
  usd: number;
  successURL: string;
  cancelURL: string;
}

export function CheckoutForm({
  usd,
  successURL,
  cancelURL,
}: CheckoutFormProps): JSX.Element {
  const auth = useAuth();
  const token = useAuthToken();
  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />;
  }
  if (auth.error) {
    return <div>Auth Error: {auth.error.message}</div>;
  }
  if (token.error) {
    return <div>Token Error: {token.error.message}</div>;
  }
  if (!auth.user) {
    return <div>User not found</div>;
  }
  if (!auth.user.email) {
    return <div>Email not found</div>;
  }

  return (
    <form action={routes.checkoutSession} method="POST">
      <input type="hidden" name="userID" value={auth.user.uid} />
      <input type="hidden" name="email" value={auth.user.email} />
      <input type="hidden" name="successURL" value={successURL} />
      <input type="hidden" name="cancelURL" value={cancelURL} />
      <input type="hidden" name="usd" value={usd} />
      <input
        type="hidden"
        name="authorization"
        value={`Bearer ${token.data}`}
      />
      <Button
        type="submit"
        variant="contained"
        style={{
          backgroundColor: "#7289da",
          color: "white",
          padding: "10px 20px",
          fontSize: "1.1em",
        }}
      >
        Purchase Tokens
      </Button>
    </form>
  );
}
