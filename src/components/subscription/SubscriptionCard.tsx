import React from "react"
import { SubscriptionTier } from "@/api/subscriptions"
import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface SubscriptionCardProps {
  tier: SubscriptionTier
  isYearly: boolean
  isSelected: boolean
  authToken: string
  userID: string
  email: string | null
  checkoutURL: string
  className?: string
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  tier,
  isYearly,
  isSelected,
  authToken,
  userID,
  email,
  checkoutURL,
  className,
}) => {
  const price = tier.prices.find(
    (p) => p.interval === (isYearly ? "year" : "month")
  )

  if (!price) return null

  return (
    <Card
      className={cn(
        "relative overflow-hidden h-full",
        isSelected && "border-primary ring-1 ring-primary",
        tier.mostPopular && "border-primary",
        className
      )}
    >
      {tier.mostPopular && (
        <div className="absolute top-0 right-0 left-0 bg-primary/10 text-primary text-xs font-semibold text-center py-1">
          Most Popular
        </div>
      )}

      <CardHeader className={cn(tier.mostPopular && "pt-8")}>
        <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            {formatPrice(price.amount)}
          </span>
          <span className="text-muted-foreground text-sm">
            {formatInterval(price.interval)}
          </span>
        </div>

        <ul className="space-y-2">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4 mt-auto">
        <form action={checkoutURL} method="POST" className="w-full">
          <input type="hidden" name="user_id" value={userID} />
          <input type="hidden" name="email" value={email || ""} />
          <input type="hidden" name="base_url" value={window.location.origin} />
          <input type="hidden" name="lookup_key" value={price.lookupKey} />
          <input type="hidden" name="product_type" value="ditto_subscription" />
          <input type="hidden" name="plan_tier" value={tier.planTier} />
          <input
            type="hidden"
            name="authorization"
            value={`Bearer ${authToken}`}
          />
          <Button type="submit" className="w-full" size="lg">
            SUBSCRIBE NOW
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

export default SubscriptionCard

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatInterval(interval: string) {
  return interval === "year" ? "/yr" : "/mo"
}
