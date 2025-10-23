declare global {
  interface Window {
    google: {
      charts: {
        load: (version: string, options: { packages: string[] }) => void;
        setOnLoadCallback: (callback: () => void) => void;
      };
      visualization: {
        arrayToDataTable: (data: (string | number)[][]) => any;
        BubbleChart: new (element: HTMLElement) => {
          draw: (data: any, options: any) => void;
        };
        events: {
          addListener: (chart: any, event: string, callback: (e: any) => void) => void;
        };
      };
    };
  }
}

export {};
