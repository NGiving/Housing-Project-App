import * as Bokeh from "@bokeh/bokehjs";

declare global {
  interface Window {
    Bokeh: typeof Bokeh;
  }
}

export {};
