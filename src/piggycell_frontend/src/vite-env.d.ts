/// <reference types="vite/client" />
/// <reference types="@types/react" />
/// <reference types="@types/react-dom" />
/// <reference types="@types/node" />

declare module "*.svg" {
  import * as React from "react";
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement>
  >;
  const src: string;
  export default src;
}

declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}
