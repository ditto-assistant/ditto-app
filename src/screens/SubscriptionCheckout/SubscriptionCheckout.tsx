import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { useBalance } from "@/hooks/useBalance";
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth, useAuthToken } from "@/hooks/useAuth";
import { routes } from "@/firebaseConfig";
import { useSubscriptionTiers } from "@/hooks/useSubscriptionTiers";
import { useUser } from "@/hooks/useUser";
import SubscriptionToggle from "@/components/subscription/SubscriptionToggle";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";
import "./SubscriptionCheckout.css";

const SubscriptionCheckout: React.FC = () => {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const defaultIsYearly = searchParams.get("plan")?.includes("yearly") ?? false;
  const [isYearly, setIsYearly] = useState(defaultIsYearly);
  const balance = useBalance();
  const auth = useAuth();
  const token = useAuthToken();
  const { data: subscriptionData, isLoading: isLoadingSubscriptions } =
    useSubscriptionTiers();
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    const planId = searchParams.get("plan");
    if (planId) {
      setSelectedPlan(planId);
    } else if (subscriptionData?.tiers) {
      // Select the first available plan of the current interval
      const defaultTier = subscriptionData.tiers[0];
      const defaultPrice = defaultTier.prices.find(
        (p) => p.interval === (isYearly ? "year" : "month"),
      );
      if (defaultPrice) {
        setSelectedPlan(defaultPrice.lookupKey);
      }
    }
  }, [searchParams, subscriptionData, isYearly]);

  if (
    auth.isLoading ||
    token.isLoading ||
    balance.isLoading ||
    isLoadingSubscriptions
  ) {
    return (
      <div className="subscription-loading-container">
        <LoadingSpinner size={45} />
      </div>
    );
  }
  const SuccessDisplay = ({
    sessionId,
    stripeCustomerID,
  }: {
    sessionId?: string;
    stripeCustomerID?: string;
  }) => {
    if (!sessionId && !stripeCustomerID) {
      return null;
    }
    return (
      <section>
        <div className="product Box-root">
          <div className="description Box-root">
            <h3>Subscription to {selectedPlan} successful!</h3>
          </div>
        </div>
        <form action={routes.createPortalSession} method="POST">
          {sessionId && (
            <input type="hidden" name="session_id" value={sessionId} />
          )}
          {stripeCustomerID && (
            <input
              type="hidden"
              name="stripe_customer_id"
              value={stripeCustomerID}
            />
          )}
          <input type="hidden" name="base_url" value={window.location.href} />
          <input type="hidden" name="user_id" value={uid} />
          <input
            type="hidden"
            name="authorization"
            value={`Bearer ${token.data}`}
          />
          <button id="checkout-and-portal-button" type="submit">
            Manage your billing information
          </button>
        </form>
      </section>
    );
  };

  if (!auth.user) {
    navigate("/login?redirect=/checkout?plan=" + selectedPlan);
    return null;
  }

  const { uid, email } = auth.user;

  const handleIntervalChange = (yearly: boolean) => {
    setIsYearly(yearly);
    if (selectedPlan && subscriptionData) {
      // Find the corresponding plan for the new interval
      const currentTier = subscriptionData.tiers.find((tier) =>
        tier.prices.some((price) => price.lookupKey === selectedPlan),
      );
      if (currentTier) {
        const newPrice = currentTier.prices.find(
          (p) => p.interval === (yearly ? "year" : "month"),
        );
        if (newPrice) {
          setSelectedPlan(newPrice.lookupKey);
        }
      }
    }
  };

  return (
    <div className="subscription-overlay">
      <div className="subscription-container">
        <header className="subscription-header">
          <h2 className="subscription-header-title">Subscribe to Ditto</h2>
        </header>

        <div className="subscription-content">
          <div className="subscription-info-container">
            <h3 className="subscription-balance-header">Current Status</h3>
            <div className="subscription-balance-grid">
              {!balance.isLoading ? (
                <p className="subscription-balance-item">
                  Balance:{" "}
                  <span className="subscription-highlight-text">
                    {balance.data?.balance}
                  </span>{" "}
                  tokens
                </p>
              ) : (
                <div className="subscription-spinner-container">
                  <LoadingSpinner size={45} inline={true} />
                </div>
              )}
            </div>
          </div>
          <div className="subscription-divider"></div>

          {(sessionId || user?.stripeCustomerID) && (
            <SuccessDisplay
              sessionId={sessionId ?? undefined}
              stripeCustomerID={user?.stripeCustomerID}
            />
          )}

          <SubscriptionToggle
            isYearly={isYearly}
            onChange={handleIntervalChange}
          />

          <div className="subscription-plans">
            <div className="subscription-plans-grid">
              {subscriptionData?.tiers.map((tier) => (
                <SubscriptionCard
                  key={tier.name}
                  tier={tier}
                  isYearly={isYearly}
                  isSelected={tier.prices.some(
                    (p) => p.lookupKey === selectedPlan,
                  )}
                  authToken={token.data || ""}
                  userID={uid}
                  email={email}
                  checkoutURL={routes.checkoutSession}
                />
              ))}
            </div>
          </div>

          <Button
            variant="contained"
            onClick={() => navigate("/")}
            className="subscription-nav-button"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
