import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted/50 via-muted to-muted/50 bg-[length:200%_100%]",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      style={{
        backgroundImage: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.8) 50%, hsl(var(--muted)) 100%)",
        animation: "shimmer 2s ease-in-out infinite"
      }}
      {...props}
    />
  )
}

export { Skeleton }
