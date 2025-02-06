import { useAuth, useAuthToken } from "@/hooks/useAuth";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@mui/material";

/**
 * A form component that handles Stripe checkout with proper authentication.
 *
 * @param {Object} props - Component props
 * @param {number} props.usd - The amount in USD to charge
 * @param {string} props.successURL - The URL to redirect to after successful payment
 * @param {string} props.cancelURL - The URL to redirect to if payment is cancelled
 * @returns {JSX.Element} The checkout form component
 */
export function CheckoutForm({ usd, successURL, cancelURL }) {
  const auth = useAuth();
  const token = useAuthToken();

  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />;
  }
  if (auth.error) {
    return <div>Auth Error: {auth.error}</div>;
  }
  if (token.error) {
    return <div>Token Error: {token.error}</div>;
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
