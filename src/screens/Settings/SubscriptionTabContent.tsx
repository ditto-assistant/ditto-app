import React from "react";
import { Button } from "@mui/material";
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import { useAuth, useAuthToken } from "@/hooks/useAuth";
import { routes } from "@/firebaseConfig";
import { useSubscriptionTiers } from "@/hooks/useSubscriptionTiers";
import { useUser } from "@/hooks/useUser";
import SubscriptionToggle from "@/components/subscription/SubscriptionToggle";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";
import "./SubscriptionTabContent.css";

const SubscriptionTabContent: React.FC = () => {
  const { data: user, isLoading: isUserLoading } = useUser();
  const [isYearly, setIsYearly] = React.useState(false);
  const balance = useBalance();
  const auth = useAuth();
  const token = useAuthToken();
  const { data: subscriptionData, isLoading: isLoadingSubscriptions } =
    useSubscriptionTiers();
  const [selectedPlan, setSelectedPlan] = React.useState<string>("");

  React.useEffect(() => {
    if (subscriptionData?.tiers) {
      // Select the first available plan of the current interval
      const defaultTier = subscriptionData.tiers[0];
      const defaultPrice = defaultTier.prices.find(
        (p) => p.interval === (isYearly ? "year" : "month"),
      );
      if (defaultPrice) {
        setSelectedPlan(defaultPrice.lookupKey);
      }
    }
  }, [subscriptionData, isYearly]);

  if (
    auth.isLoading ||
    token.isLoading ||
    balance.isLoading ||
    isLoadingSubscriptions ||
    isUserLoading
  ) {
    return (
      <div className="subscription-loading-container">
        <LoadingSpinner size={45} />
      </div>
    );
  }

  if (!auth.user) {
    return <div>Please log in to manage your subscription.</div>;
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

  // If user is already subscribed, show manage subscription content
  if (user?.subscriptionStatus === "active") {
    return (
      <div className="subscription-manage-container">
        <div className="subscription-info">
          <h3>Current Subscription</h3>
          <p>
            Status: <span className="subscription-active">Active</span>
          </p>
          <p>
            Plan:{" "}
            <span className="subscription-highlight">
              Pro Tier {user.planTier}
            </span>
          </p>
          {user.cancelAtPeriodEnd && (
            <p className="subscription-cancellation">
              Your subscription will end at the current billing period.
            </p>
          )}
        </div>

        <form
          action={routes.createPortalSession}
          method="POST"
          className="subscription-manage-form"
        >
          <input
            type="hidden"
            name="stripe_customer_id"
            value={user.stripeCustomerID || ""}
          />
          <input type="hidden" name="base_url" value={window.location.href} />
          <input type="hidden" name="user_id" value={uid} />
          <input
            type="hidden"
            name="authorization"
            value={`Bearer ${token.data}`}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            className="subscription-manage-button"
          >
            Manage Your Subscription
          </Button>
        </form>
      </div>
    );
  }

  // Otherwise, show subscription options for free users
  return (
    <div className="subscription-tab-container">
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

      <SubscriptionToggle isYearly={isYearly} onChange={handleIntervalChange} />

      <div className="subscription-plans">
        <div className="subscription-plans-grid">
          {subscriptionData?.tiers.map((tier) => (
            <SubscriptionCard
              key={tier.name}
              tier={tier}
              isYearly={isYearly}
              isSelected={tier.prices.some((p) => p.lookupKey === selectedPlan)}
              authToken={token.data || ""}
              userID={uid}
              email={email}
              checkoutURL={routes.checkoutSession}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTabContent;
