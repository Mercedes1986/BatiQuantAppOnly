import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  children,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-2xl font-extrabold transition-all active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-0";

  const variants = {
    primary:
      "border border-blue-500 bg-blue-600 text-white shadow-[0_16px_35px_rgba(37,99,235,0.28)] hover:-translate-y-0.5 hover:bg-blue-700 focus:ring-blue-300",
    secondary:
      "border border-white/70 bg-white/88 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl hover:border-slate-200 hover:bg-white focus:ring-slate-300",
    outline:
      "border border-blue-200 bg-blue-50/80 text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.10)] hover:bg-blue-100/80 focus:ring-blue-200",
    ghost:
      "bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-700 focus:ring-slate-200",
    danger:
      "border border-red-200 bg-red-50/90 text-red-600 shadow-[0_10px_24px_rgba(239,68,68,0.10)] hover:bg-red-100 focus:ring-red-200",
  };

  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>
      {icon && <span className="mr-2 -ml-1">{icon}</span>}
      {children}
    </button>
  );
};
