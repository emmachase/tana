import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { useScrollState } from "~/hooks/useScrollState";
import { useNavigate } from "react-router";

type NavItem = {
  label: string;
  href: string;
};

interface HeaderProps extends React.ComponentProps<"div"> {
  navItems?: NavItem[];
}

export function Header({
  className,
  navItems = [
    { label: "Gallery", href: "/" },
    { label: "Upload", href: "/upload" },
  ],
  ...props
}: HeaderProps) {
  const navigate = useNavigate();
  const scrolled = useScrollState();
  const location = useLocation();

  return (
    <div
      className={cn("sticky top-0 z-10 flex self-stretch p-4", className)}
      {...props}
    >
      <div
        className={cn(
          "flex flex-1 items-center rounded-xl border p-4 transition-[background,border] duration-300",
          scrolled
            ? "bg-popover/50 border-border/50 backdrop-blur-sm"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="flex items-center">
          <Logo className="h-12 w-auto" />
        </div>

        {navItems.length > 0 && (
          <nav className="ml-6 flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "hover:text-primary text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex gap-2">
          <Button
            variant="ghostPrimary"
            onClick={() => {
              navigate("/logout");
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
