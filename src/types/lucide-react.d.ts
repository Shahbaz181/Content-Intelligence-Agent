declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  type IconProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  };

  export const AlertCircle: ComponentType<IconProps>;
  export const ArrowUpRight: ComponentType<IconProps>;
  export const ArrowLeftRight: ComponentType<IconProps>;
  export const BarChart3: ComponentType<IconProps>;
  export const BrainCircuit: ComponentType<IconProps>;
  export const CalendarDays: ComponentType<IconProps>;
  export const Check: ComponentType<IconProps>;
  export const ChevronDown: ComponentType<IconProps>;
  export const ChevronRight: ComponentType<IconProps>;
  export const GitBranch: ComponentType<IconProps>;
  export const LayoutDashboard: ComponentType<IconProps>;
  export const Library: ComponentType<IconProps>;
  export const Lightbulb: ComponentType<IconProps>;
  export const LineChart: ComponentType<IconProps>;
  export const Loader2: ComponentType<IconProps>;
  export const Sparkles: ComponentType<IconProps>;
  export const Target: ComponentType<IconProps>;
  export const UserRound: ComponentType<IconProps>;
  export const UsersRound: ComponentType<IconProps>;
  export const WandSparkles: ComponentType<IconProps>;
}
