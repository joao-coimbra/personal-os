"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { StarIcon } from "lucide-react";
import { useState } from "react";

const ratingVariants = cva("flex items-center", {
  defaultVariants: {
    size: "default",
  },
  variants: {
    size: {
      default: "gap-2.5",
      lg: "gap-3",
      sm: "gap-2",
    },
  },
});

const starVariants = cva("", {
  defaultVariants: {
    size: "default",
  },
  variants: {
    size: {
      default: "h-5 w-5",
      lg: "h-6 w-6",
      sm: "h-4 w-4",
    },
  },
});

const valueVariants = cva("w-5 text-muted-foreground", {
  defaultVariants: {
    size: "default",
  },
  variants: {
    size: {
      default: "text-sm",
      lg: "text-base",
      sm: "text-xs",
    },
  },
});

function Rating({
  rating,
  maxRating = 5,
  size,
  className,
  starClassName,
  showValue = false,
  editable = false,
  onRatingChange,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof ratingVariants> & {
    /**
     * Current rating value (supports decimal values for partial stars)
     */
    rating: number;
    /**
     * Maximum rating value (number of stars to show)
     */
    maxRating?: number;
    /**
     * Whether to show the numeric rating value
     */
    showValue?: boolean;
    /**
     * Class name for the value span
     */
    starClassName?: string;
    /**
     * Whether the rating is editable (clickable)
     */
    editable?: boolean;
    /**
     * Callback function called when rating changes
     */
    onRatingChange?: (rating: number) => void;
  }) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const displayRating =
    editable && hoveredRating !== null ? hoveredRating : rating;

  const handleStarClick = (starRating: number) => {
    if (editable && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarMouseEnter = (starRating: number) => {
    if (editable) {
      setHoveredRating(starRating);
    }
  };

  const handleStarMouseLeave = () => {
    if (editable) {
      setHoveredRating(null);
    }
  };

  const renderStars = () => {
    const stars = [];

    for (let i = 1; i <= maxRating; i++) {
      const filled = displayRating >= i;
      const partiallyFilled = displayRating > i - 1 && displayRating < i;
      const fillPercentage = partiallyFilled
        ? (displayRating - (i - 1)) * 100
        : 0;

      stars.push(
        <div
          className={cn("relative", editable && "cursor-pointer")}
          key={i}
          onClick={() => handleStarClick(i)}
          onMouseEnter={() => handleStarMouseEnter(i)}
          onMouseLeave={handleStarMouseLeave}
        >
          {/* Background star (empty) */}
          <StarIcon
            className={cn(starVariants({ size }), "text-muted-foreground/30")}
            data-slot="rating-star-empty"
          />

          {/* Filled star */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              width: filled ? "100%" : `${fillPercentage}%`,
            }}
          >
            <StarIcon
              className={cn(
                starVariants({ size }),
                "fill-yellow-400 text-yellow-400"
              )}
              data-slot="rating-star-filled"
            />
          </div>
        </div>
      );
    }

    return stars;
  };

  return (
    <div
      className={cn(ratingVariants({ size }), className)}
      data-slot="rating"
      {...props}
    >
      <div className="flex items-center">{renderStars()}</div>
      {showValue && (
        <span
          className={cn(valueVariants({ size }), starClassName)}
          data-slot="rating-value"
        >
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export { Rating };
