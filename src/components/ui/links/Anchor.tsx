import React from "react";

interface AnchorLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "social-link";
  children: React.ReactNode;
}

export const A: React.FC<AnchorLinkProps> = ({
  variant = "social-link",
  children,
  className,
  ...props
}) => {
  return (
    <a
      {...props}
      className={`${variant} ${className || ""}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};
