import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[16rem] md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-soft transition-shadow duration-200 ease-out hover:shadow-float",
        className,
      )}
    >
      {header}
      <div className="transition-transform duration-200 ease-out group-hover/bento:translate-x-1">
        {icon}
        <div className="mt-2 mb-1 font-heading text-base font-semibold">
          {title}
        </div>
        <div className="text-sm text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
};
