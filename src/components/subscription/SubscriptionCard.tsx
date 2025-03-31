import React from "react";
import { Button } from "@mui/material";
import { SubscriptionTier } from "@/api/subscriptions";
import "./SubscriptionCard.css";

interface SubscriptionCardProps {
  tier: SubscriptionTier;
  isYearly: boolean;
  isSelected: boolean;
  authToken: string;
  userID: string;
  email: string | null;
  checkoutURL: string;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  tier,
  isYearly,
  isSelected,
  authToken,
  userID,
  email,
  checkoutURL,
}) => {
  const price = tier.prices.find(
    (p) => p.interval === (isYearly ? "year" : "month"),
  );

  if (!price) return null;

  return (
    <div
      className={`subscription-card ${isSelected ? "selected" : ""} ${tier.mostPopular ? "popular" : ""}`}
    >
      {tier.mostPopular && (
        <div className="subscription-popular-badge">Most Popular</div>
      )}
      <div className="subscription-card-content">
        <h3 className="subscription-card-name">{tier.name}</h3>
        <p className="subscription-card-description">{tier.description}</p>

        <div className="subscription-card-price">
          <span className="price">{formatPrice(price.amount)}</span>
          <span className="interval">{formatInterval(price.interval)}</span>
        </div>

        <ul className="subscription-card-features">
          {tier.features.map((feature, index) => (
            <li key={index} className="subscription-feature-item">
              {feature}
            </li>
          ))}
        </ul>

        <form
          action={checkoutURL}
          method="POST"
          className="subscription-card-form"
        >
          <input type="hidden" name="user_id" value={userID} />
          <input type="hidden" name="email" value={email || ""} />
          <input type="hidden" name="base_url" value={window.location.href} />
          <input type="hidden" name="lookup_key" value={price.lookupKey} />
          <input type="hidden" name="product_type" value="ditto_subscription" />
          <input
            type="hidden"
            name="authorization"
            value={`Bearer ${authToken}`}
          />
          <Button
            type="submit"
            variant="contained"
            className="subscription-card-button"
            fullWidth
          >
            SUBSCRIBE NOW
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionCard;

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatInterval(interval: string) {
  return interval === "year" ? "/yr" : "/mo";
}
