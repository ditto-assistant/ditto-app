import React from "react"
import { useFormStatus } from "react-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { useBalance } from "@/hooks/useBalance"
import { useAuth, useAuthToken } from "@/hooks/useAuth"
import { routes } from "@/firebaseConfig"
import { useSubscriptionTiers } from "@/hooks/useSubscriptionTiers"
import { useUser } from "@/hooks/useUser"
import SubscriptionToggle from "@/components/subscription/SubscriptionToggle"
import SubscriptionCard from "@/components/subscription/SubscriptionCard"
import { CreditCard, LogOut, Edit3, Check, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import { useUserAvatar } from "@/hooks/useUserAvatar"
import { updateUserName } from "@/api/updateUserName"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { User } from "@/api/getUser"

// Name edit form component that uses React 19 form actions
const NameEditForm: React.FC<{
  user: User & {
    uid: string
    displayName: string | null
  }
  onCancel: () => void
  onSuccess: () => void
}> = ({ user, onCancel, onSuccess }) => {
  const queryClient = useQueryClient()

  const updateNameAction = async (formData: FormData) => {
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Both first and last name are required")
      return
    }

    if (!user?.uid) {
      toast.error("User not authenticated")
      return
    }

    const result = await updateUserName(user.uid, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })

    if (result.err) {
      toast.error(`Failed to update name: ${result.err}`)
      return
    }

    // Update the cache with the new user data
    queryClient.setQueryData(["user"], result.ok)
    toast.success("Name updated successfully!")
    onSuccess()
  }

  // Extract current names, fallback to display name if needed
  const currentFirstName =
    user?.firstName || user?.displayName?.split(" ")[0] || ""
  const currentLastName =
    user?.lastName || user?.displayName?.split(" ")[1] || ""

  return (
    <form action={updateNameAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="firstName"
          placeholder="First Name"
          defaultValue={currentFirstName}
          required
          className="h-9"
        />
        <Input
          name="lastName"
          placeholder="Last Name"
          defaultValue={currentLastName}
          required
          className="h-9"
        />
      </div>
      <div className="flex gap-2">
        <NameFormSubmitButton />
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </form>
  )
}

// Separate component for submit button to use useFormStatus
const NameFormSubmitButton: React.FC = () => {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <>
          <Skeleton className="h-3 w-3 rounded-full mr-1" />
          Saving...
        </>
      ) : (
        <>
          <Check className="h-4 w-4 mr-1" />
          Save
        </>
      )}
    </Button>
  )
}

const SubscriptionTabContent: React.FC = () => {
  const { data: user, isLoading: isUserLoading } = useUser()
  const [isYearly, setIsYearly] = React.useState(false)
  const [isEditingName, setIsEditingName] = React.useState(false)
  const balance = useBalance()
  const auth = useAuth()
  const userAvatar = useUserAvatar(auth.user?.photoURL)
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
      <div className="p-4 space-y-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar and name section skeleton */}
            <div className="space-y-3">
              <div className="flex items-center">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Email skeleton */}
            <Skeleton className="h-3 w-48" />

            {/* Subscription status skeleton */}
            <Skeleton className="h-5 w-16 rounded" />

            {/* Balance section skeleton */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded ml-auto" />
            </div>

            {/* Theme section skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 flex items-center justify-center">
                <Skeleton className="h-6 w-6 rounded" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>

          <CardFooter className="flex gap-4">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 flex-1 rounded" />
          </CardFooter>
        </Card>

        {/* Subscription cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full rounded" />
              </CardFooter>
            </Card>
          ))}
        </div>
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
        {/* Avatar and name section */}
        <div className="space-y-4">
          {isEditingName && user ? (
            <NameEditForm
              user={{ ...user, uid, displayName }}
              onCancel={() => setIsEditingName(false)}
              onSuccess={() => setIsEditingName(false)}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center">
                <img
                  src={userAvatar || undefined}
                  alt="User Avatar"
                  className="h-6 w-6 rounded-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  className="h-6 w-6 p-0 flex items-center justify-center"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <div className="text-sm">
                  {user?.firstName && user?.lastName ? (
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                  ) : displayName ? (
                    <span className="text-muted-foreground">{displayName}</span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Name not set
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>

        {/* Subscription status */}
        {user && user.subscriptionStatus !== "free" && (
          <div>
            <Badge
              className={cn(
                "rounded",
                "gradient-title",
                "border-transparent",
                "dark:bg-gradient-to-r dark:from-primary dark:to-blue-400",
                "p-0 py-0.5"
              )}
              title={
                subscriptionData?.tiers.find(
                  (tier) => tier.planTier === user.planTier
                )?.name
              }
            >
              {
                subscriptionData?.tiers.find(
                  (tier) => tier.planTier === user.planTier
                )?.name
              }
              {user.isTierBoostedFromBalance && (
                <SubscriptionBoostIndicator isBoosted={true} className="ml-1" />
              )}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">
            Balance: {balance.data?.balance} tokens
          </span>
          {user?.cancelAtPeriodEnd && user.currentPeriodEnd && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-500 ml-auto"
            >
              Ending {user.currentPeriodEnd.toLocaleDateString()}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-6 w-6 flex items-center justify-center">
            <ModeToggle />
          </div>
          <span className="text-sm">Theme</span>
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
