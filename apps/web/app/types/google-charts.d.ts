declare global {
  interface Window {
    google: {
      charts: {
        load: (version: string, options: { packages: string[] }) => void;
        setOnLoadCallback: (callback: () => void) => void;
      };
      visualization: {
        DataTable: new () => {
          addColumn: (column: string | { type: string; role: string; p: { html: boolean } }, label?: string) => void;
          addRows: (rows: (string | number)[][]) => void;
        };
        Sankey: new (element: HTMLElement) => {
          draw: (data: any, options: any) => void;
        };
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
