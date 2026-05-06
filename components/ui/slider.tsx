import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function getSliderValues({
  defaultValue,
  max,
  min,
  value,
}: Pick<SliderPrimitive.Root.Props, "defaultValue" | "max" | "min" | "value">) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(defaultValue)) {
    return defaultValue;
  }

  return [min, max];
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const values = getSliderValues({ defaultValue, max, min, value });

  return (
    <SliderPrimitive.Root
      className={cn("data-vertical:h-full data-horizontal:w-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      max={max}
      min={min}
      thumbAlignment="edge"
      value={value}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none select-none items-center data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50">
        <SliderPrimitive.Track
          className="relative grow select-none overflow-hidden bg-input/50 data-horizontal:h-0.5 data-vertical:h-full data-horizontal:w-full data-vertical:w-0.5"
          data-slot="slider-track"
        >
          <SliderPrimitive.Indicator
            className="select-none bg-primary data-horizontal:h-full data-vertical:w-full"
            data-slot="slider-range"
          />
        </SliderPrimitive.Track>
        {values.map((thumbValue) => (
          <SliderPrimitive.Thumb
            className="block size-3 shrink-0 select-none border-none bg-primary transition-colors hover:ring-2 hover:ring-ring/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50"
            data-slot="slider-thumb"
            key={thumbValue}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
