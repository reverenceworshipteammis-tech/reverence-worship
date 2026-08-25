export type ProjectionScreenLike = {
  id?: string;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  width: number;
  height: number;
  label?: string;
  isPrimary?: boolean;
  isInternal?: boolean;
};

export function projectionScreenId(screen: ProjectionScreenLike) {
  return screen.id ?? `${screen.availLeft}:${screen.availTop}:${screen.width}:${screen.height}:${screen.label ?? ""}`;
}

export function chooseProjectionScreen(
  screens: ProjectionScreenLike[],
  currentScreen: ProjectionScreenLike | null,
  selectedScreenId?: string,
) {
  const selected = selectedScreenId ? screens.find((screen) => projectionScreenId(screen) === selectedScreenId) : null;
  if (selected) return selected;

  return screens.find((screen) => !screen.isInternal && screen !== currentScreen)
    ?? screens.find((screen) => screen !== currentScreen && !screen.isPrimary)
    ?? screens.find((screen) => screen !== currentScreen)
    ?? screens[0]
    ?? null;
}
