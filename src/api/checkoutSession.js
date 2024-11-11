import { useAuth, useAuthToken } from "@/hooks/useAuth";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@mui/material";

/**
 * Creates a Stripe checkout session for purchasing tokens.
 * The browser will automatically redirect to the Stripe checkout page.
 *
 * @param {Object} params - The parameters for creating the checkout session
 * @param {string} params.successURL - The URL to redirect to after successful payment
 * @param {string} params.cancelURL - The URL to redirect to if payment is cancelled
 * @param {number} params.usd - The amount in USD to charge
 * @returns {Promise<{
 *   ok?: void,
 *   err?: string
 * }>} A promise that resolves to an object:
 *   - If successful, returns {ok: undefined} and the browser will redirect to Stripe
 *   - If unsuccessful, returns {err: errorMessage} where errorMessage describes the error
 */
export async function createCheckoutSession({ successURL, cancelURL, usd }) {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return {
      err: `createCheckoutSession: Unable to get auth token: ${tok.err}`,
    };
  }

  try {
    const response = await fetch(routes.checkoutSession, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        userID: tok.ok.userID,
        email: tok.ok.email,
        successURL,
        cancelURL,
        usd,
      }),
    });

    if (response.ok) {
      const url = await response.text();
      window.location.href = url;
      return { ok: undefined };
    }

    const errorText = await response.text();
    return { err: `createCheckoutSession: Server error: ${errorText}` };
  } catch (error) {
    console.error("Error in createCheckoutSession:", error);
    return { err: `createCheckoutSession: Network error: ${error.message}` };
  }
}

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

  if (auth.loading) {
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
        value={`Bearer ${token.token}`}
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
