import React from "react"
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner"
import { useBalance } from "@/hooks/useBalance"
import { useAuth, useAuthToken } from "@/hooks/useAuth"
import { routes } from "@/firebaseConfig"
import { useSubscriptionTiers } from "@/hooks/useSubscriptionTiers"
import { useUser } from "@/hooks/useUser"
import SubscriptionToggle from "@/components/subscription/SubscriptionToggle"
import SubscriptionCard from "@/components/subscription/SubscriptionCard"
import { CreditCard, LogOut, User, Moon, Sun } from "lucide-react"
import { useModal } from "@/hooks/useModal"
import SubscriptionBoostIndicator from "@/components/subscription/SubscriptionBoostIndicator"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { useTheme } from "@/components/theme-provider"

const SubscriptionTabContent: React.FC = () => {
  const { data: user, isLoading: isUserLoading } = useUser()
  const [isYearly, setIsYearly] = React.useState(false)
  const balance = useBalance()
  const auth = useAuth()
  const token = useAuthToken()
  const { data: subscriptionData, isLoading: isLoadingSubscriptions } =
    useSubscriptionTiers()
  const [selectedPlan, setSelectedPlan] = React.useState<string>("")
  const { createOpenHandler, createCloseHandler } = useModal()
  const openTokenModal = createOpenHandler("tokenCheckout")
  const closeSettingsModal = createCloseHandler("settings")

  React.useEffect(() => {
    if (subscriptionData?.tiers) {
      // Select the first available plan of the current interval
      const defaultTier = subscriptionData.tiers[0]
      const defaultPrice = defaultTier.prices.find(
        (p) => p.interval === (isYearly ? "year" : "month")
      )
      if (defaultPrice) {
        setSelectedPlan(defaultPrice.lookupKey)
      }
    }
  }, [subscriptionData, isYearly])

  if (
    auth.isLoading ||
    token.isLoading ||
    balance.isLoading ||
    isLoadingSubscriptions ||
    isUserLoading
  ) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size={45} />
      </div>
    )
  }

  if (!auth.user) {
    return (
      <div data-subscription-section>
        Please log in to manage your subscription.
      </div>
    )
  }

  const { uid, email, displayName } = auth.user

  const handleIntervalChange = (yearly: boolean) => {
    setIsYearly(yearly)
    if (selectedPlan && subscriptionData) {
      // Find the corresponding plan for the new interval
      const currentTier = subscriptionData.tiers.find((tier) =>
        tier.prices.some((price) => price.lookupKey === selectedPlan)
      )
      if (currentTier) {
        const newPrice = currentTier.prices.find(
          (p) => p.interval === (yearly ? "year" : "month")
        )
        if (newPrice) {
          setSelectedPlan(newPrice.lookupKey)
        }
      }
    }
  }

  const handleLogout = () => {
    auth.signOut()
    closeSettingsModal()
  }

  // Account card that shows for all users
  const accountCard = (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {displayName ? (
                <span className="text-sm font-medium">{displayName}</span>
              ) : null}
            </div>
            <span className="text-sm text-muted-foreground">{email}</span>
          </div>
          {user && user.subscriptionStatus !== "free" && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {
                subscriptionData?.tiers.find(
                  (tier) => tier.planTier === user.planTier
                )?.name
              }
              {user.isTierBoostedFromBalance && (
                <SubscriptionBoostIndicator isBoosted={true} className="ml-2" />
              )}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              Balance: {balance.data?.balance} tokens
            </span>
          </div>
          {user?.cancelAtPeriodEnd && user.currentPeriodEnd && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500">
              Ending {user.currentPeriodEnd.toLocaleDateString()}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Theme</span>
          </div>
          <ModeToggle />
        </div>
      </CardContent>

      <CardFooter className="flex gap-4">
        <Button
          variant="default"
          className="flex-1"
          onClick={() => {
            closeSettingsModal()
            openTokenModal()
          }}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          BUY TOKENS
        </Button>

        <Button variant="outline" className="flex-1" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          LOG OUT
        </Button>
      </CardFooter>
    </Card>
  )

  // If user is already subscribed, show only account + manage subscription
  if (user && user.subscriptionStatus !== "free") {
    return (
      <div className="p-4 space-y-6">
        {accountCard}

        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>
              Manage your current subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={routes.createPortalSession}
              method="POST"
              className="w-full"
            >
              <input
                type="hidden"
                name="stripe_customer_id"
                value={user.stripeCustomerID || ""}
              />
              <input
                type="hidden"
                name="base_url"
                value={window.location.origin}
              />
              <input type="hidden" name="user_id" value={uid} />
              <input
                type="hidden"
                name="authorization"
                value={`Bearer ${token.data}`}
              />

              <Button type="submit" className="w-full">
                MANAGE YOUR SUBSCRIPTION
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Otherwise, show account + subscription options for free users
  return (
    <div data-subscription-section className="p-4 space-y-6">
      {accountCard}

      <div className="mb-6">
        <SubscriptionToggle
          isYearly={isYearly}
          onChange={handleIntervalChange}
          className="mb-6"
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
  )
}

export default SubscriptionTabContent
