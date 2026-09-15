import * as Primitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";
export const Tabs = Primitive.Root;
export function TabsList({ className, ...props }) {
  return (
    <Primitive.List className={cn("workspace-tabs", className)} {...props} />
  );
}
export function TabsTrigger({ className, ...props }) {
  return (
    <Primitive.Trigger
      className={cn("data-[state=active]:text-lime-300", className)}
      {...props}
    />
  );
}
export function TabsContent({ className, value, ...props }) {
  return (
    <Primitive.Content
      id={value === "card" ? "card-panel" : value + "-panel"}
      value={value}
      className={cn("workspace-panel", className)}
      {...props}
    />
  );
}
