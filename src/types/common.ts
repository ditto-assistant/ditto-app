export type Result<T> = {
  ok?: T;
  err?: string;
};

export type FetchHook<T> = Result<T> & {
  loading: boolean;
  refetch: () => void;
};
