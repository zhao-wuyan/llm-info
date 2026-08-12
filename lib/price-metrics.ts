export const priceMetric = { input: "textInput", output: "textOutput", cacheRead: "textInput_cacheRead", cacheWrite: "textInput_cacheWrite" } as const;
export type PriceMetricKey = keyof typeof priceMetric;
