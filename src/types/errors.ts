export const ErrorPaymentRequired = new Error(
  "Payment Required. Please check your token balance.",
  {
    cause: {
      status: 402,
      message: "Payment Required. Please check your token balance.",
    },
  },
);
