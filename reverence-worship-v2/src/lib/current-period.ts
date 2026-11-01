import "server-only";

import { cache } from "react";
import { getSystemSetting } from "@/lib/system-settings";
import {
  CURRENT_PERIOD_ENABLED_SETTING_KEY,
  CURRENT_PERIOD_END_SETTING_KEY,
  CURRENT_PERIOD_START_SETTING_KEY,
  resolveCurrentPeriod,
  type CurrentPeriod,
} from "@/lib/current-period-rules";

export const getCurrentPeriod = cache(async (): Promise<CurrentPeriod> => {
  const [enabled, start, end] = await Promise.all([
    getSystemSetting(CURRENT_PERIOD_ENABLED_SETTING_KEY),
    getSystemSetting(CURRENT_PERIOD_START_SETTING_KEY),
    getSystemSetting(CURRENT_PERIOD_END_SETTING_KEY),
  ]);
  return resolveCurrentPeriod(enabled, start, end);
});
